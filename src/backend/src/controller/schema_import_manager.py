"""
Schema Import Manager

Bridges external connectors with persisted Ontos assets.  Provides browse,
preview, and import operations.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from src.common.logging import get_logger
from src.connectors.base import AssetConnector, ListAssetsOptions
from src.controller.connections_manager import ConnectionsManager
from src.controller.assets_manager import AssetsManager
from src.db_models.assets import AssetDb
from src.models.assets import (
    AssetCreate,
    AssetRelationshipCreate,
    AssetStatus,
    UnifiedAssetType,
)
from src.models.schema_import import (
    BrowseNode,
    BrowseResponse,
    ImportDepth,
    ImportPreviewItem,
    ImportRequest,
    ImportResult,
    ImportResultItem,
)
from src.db_models.entity_relationships import EntityRelationshipDb
from src.repositories.assets_repository import asset_repo, asset_type_repo

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# UnifiedAssetType  ->  (Ontos AssetType name, relationship from parent)
# ---------------------------------------------------------------------------

_TYPE_MAP: Dict[str, tuple] = {
    # Databricks / Unity Catalog
    UnifiedAssetType.UC_TABLE.value: ("Table", "hasTable"),
    UnifiedAssetType.UC_VIEW.value: ("View", "hasView"),
    UnifiedAssetType.UC_MATERIALIZED_VIEW.value: ("View", "hasView"),
    UnifiedAssetType.UC_STREAMING_TABLE.value: ("Table", "hasTable"),
    UnifiedAssetType.UC_FUNCTION.value: ("System", "hasPart"),
    UnifiedAssetType.UC_MODEL.value: ("ML Model", "hasPart"),
    UnifiedAssetType.UC_VOLUME.value: ("System", "hasPart"),
    # BigQuery
    UnifiedAssetType.BQ_TABLE.value: ("Table", "hasTable"),
    UnifiedAssetType.BQ_VIEW.value: ("View", "hasView"),
    UnifiedAssetType.BQ_MATERIALIZED_VIEW.value: ("View", "hasView"),
    UnifiedAssetType.BQ_EXTERNAL_TABLE.value: ("Table", "hasTable"),
    UnifiedAssetType.BQ_ROUTINE.value: ("System", "hasPart"),
    UnifiedAssetType.BQ_MODEL.value: ("ML Model", "hasPart"),
    # Snowflake
    UnifiedAssetType.SNOWFLAKE_TABLE.value: ("Table", "hasTable"),
    UnifiedAssetType.SNOWFLAKE_VIEW.value: ("View", "hasView"),
    UnifiedAssetType.SNOWFLAKE_MATERIALIZED_VIEW.value: ("View", "hasView"),
    UnifiedAssetType.SNOWFLAKE_FUNCTION.value: ("System", "hasPart"),
    UnifiedAssetType.SNOWFLAKE_PROCEDURE.value: ("System", "hasPart"),
    # Kafka
    UnifiedAssetType.KAFKA_TOPIC.value: ("Dataset", "hasDataset"),
    UnifiedAssetType.KAFKA_SCHEMA.value: ("Dataset", "hasDataset"),
    # Power BI
    UnifiedAssetType.POWERBI_DATASET.value: ("Dataset", "hasDataset"),
    UnifiedAssetType.POWERBI_DASHBOARD.value: ("Dashboard", "hasPart"),
    UnifiedAssetType.POWERBI_REPORT.value: ("Dashboard", "hasPart"),
}

# Container node types that represent structural hierarchy (not leaf assets)
_CONTAINER_TYPES = {"catalog", "schema", "dataset", "database", "project"}

# Leaf asset types whose children (columns) come from schema_info, not from
# list_assets / list_containers.  Recursing further would re-list siblings.
_LEAF_ASSET_TYPES = {
    UnifiedAssetType.UC_TABLE.value,
    UnifiedAssetType.UC_VIEW.value,
    UnifiedAssetType.UC_MATERIALIZED_VIEW.value,
    UnifiedAssetType.UC_STREAMING_TABLE.value,
    UnifiedAssetType.BQ_TABLE.value,
    UnifiedAssetType.BQ_VIEW.value,
    UnifiedAssetType.BQ_MATERIALIZED_VIEW.value,
    UnifiedAssetType.BQ_EXTERNAL_TABLE.value,
    UnifiedAssetType.SNOWFLAKE_TABLE.value,
    UnifiedAssetType.SNOWFLAKE_VIEW.value,
    UnifiedAssetType.SNOWFLAKE_MATERIALIZED_VIEW.value,
    UnifiedAssetType.BQ_ROUTINE.value,
    UnifiedAssetType.BQ_MODEL.value,
    UnifiedAssetType.UC_FUNCTION.value,
    UnifiedAssetType.UC_MODEL.value,
    UnifiedAssetType.SNOWFLAKE_FUNCTION.value,
    UnifiedAssetType.SNOWFLAKE_PROCEDURE.value,
}


class SchemaImportManager:
    """Manages browsing remote systems and importing their structure as Ontos assets."""

    def __init__(
        self,
        connections_manager: ConnectionsManager,
        assets_manager: AssetsManager,
    ):
        self._connections = connections_manager
        self._assets = assets_manager

    # ------------------------------------------------------------------
    # Browse
    # ------------------------------------------------------------------

    def browse(
        self,
        db: Session,
        connection_id: UUID,
        path: Optional[str] = None,
    ) -> BrowseResponse:
        """Browse the remote system hierarchy for a given connection."""
        connector = self._connections.get_connector_for_connection(connection_id)
        if connector is None:
            raise ValueError(f"Connection '{connection_id}' not found or connector unavailable")

        nodes: List[BrowseNode] = []
        browse_error = None
        browse_error_detail = None

        # Use list_containers for top-level / container navigation
        try:
            containers = connector.list_containers(parent_path=path)
        except Exception as exc:
            logger.warning(f"Connector error browsing {connection_id}: {exc}")
            browse_error = "Connection error"
            browse_error_detail = str(exc)
            containers = []

        for c in containers:
            nodes.append(BrowseNode(
                name=c.get("name", ""),
                node_type=c.get("type", "unknown").lower(),
                path=c.get("path", ""),
                has_children=c.get("has_children", False),
                description=c.get("comment"),
                connector_type=connector.connector_type,
            ))

        # Also list leaf assets at this path
        try:
            options = ListAssetsOptions(path=path or "", limit=500)
            assets = connector.list_assets(options=options)
            container_paths = {n.path for n in nodes}
            for asset in assets:
                if asset.identifier in container_paths:
                    continue
                nodes.append(BrowseNode(
                    name=asset.name,
                    node_type=_display_type(asset.asset_type),
                    path=asset.identifier,
                    has_children=_has_children(asset.asset_type),
                    description=asset.description,
                    asset_type=asset.asset_type.value if asset.asset_type else None,
                    connector_type=connector.connector_type,
                ))
        except Exception as exc:
            logger.debug(f"list_assets at path '{path}' failed (OK for top-level): {exc}")

        return BrowseResponse(
            connection_id=connection_id,
            path=path,
            nodes=nodes,
            error=browse_error,
            error_detail=browse_error_detail,
        )

    # ------------------------------------------------------------------
    # Preview
    # ------------------------------------------------------------------

    def preview_import(
        self,
        db: Session,
        request: ImportRequest,
    ) -> List[ImportPreviewItem]:
        """Dry-run: compute what assets would be created or skipped."""
        connector = self._connections.get_connector_for_connection(request.connection_id)
        if connector is None:
            raise ValueError(f"Connection '{request.connection_id}' not found or connector unavailable")

        items: List[ImportPreviewItem] = []

        for selected_path in request.selected_paths:
            self._collect_items(
                db=db,
                connector=connector,
                path=selected_path,
                depth=request.depth,
                items=items,
                parent_path=None,
                current_depth=0,
            )

        return items

    # ------------------------------------------------------------------
    # Execute import
    # ------------------------------------------------------------------

    def execute_import(
        self,
        db: Session,
        request: ImportRequest,
        current_user_id: str,
    ) -> ImportResult:
        """Import selected resources (and nested children) as Ontos assets."""
        connector = self._connections.get_connector_for_connection(request.connection_id)
        if connector is None:
            raise ValueError(f"Connection '{request.connection_id}' not found or connector unavailable")

        # 1. Collect all items to import
        preview_items: List[ImportPreviewItem] = []
        for selected_path in request.selected_paths:
            self._collect_items(
                db=db,
                connector=connector,
                path=selected_path,
                depth=request.depth,
                items=preview_items,
                parent_path=None,
                current_depth=0,
            )

        result = ImportResult()

        # path -> created asset UUID (used for relationship wiring)
        created_assets: Dict[str, UUID] = {}
        type_cache: Dict[str, Any] = {}

        # 2. Create assets (parents before children — items are in BFS order)
        for item in preview_items:
            if not item.will_create:
                result.skipped += 1
                result.items.append(ImportResultItem(
                    path=item.path,
                    name=item.name,
                    asset_type=item.asset_type,
                    action="skipped",
                    asset_id=item.existing_asset_id,
                    parent_path=item.parent_path,
                ))
                if item.existing_asset_id:
                    created_assets[item.path] = item.existing_asset_id
                continue

            try:
                asset_read = self._create_asset_from_item(
                    db=db,
                    connector=connector,
                    item=item,
                    current_user_id=current_user_id,
                    _type_cache=type_cache,
                )
                created_assets[item.path] = asset_read.id
                result.created += 1
                result.items.append(ImportResultItem(
                    path=item.path,
                    name=item.name,
                    asset_type=item.asset_type,
                    action="created",
                    asset_id=asset_read.id,
                    parent_path=item.parent_path,
                ))
            except Exception as exc:
                logger.error(f"Failed to create asset for '{item.path}': {exc}", exc_info=True)
                result.errors += 1
                result.error_messages.append(f"{item.path}: {exc}")
                result.items.append(ImportResultItem(
                    path=item.path,
                    name=item.name,
                    asset_type=item.asset_type,
                    action="error",
                    error=str(exc),
                    parent_path=item.parent_path,
                ))

        # 3. Wire relationships (both asset_relationships and entity_relationships)
        # Build a lookup from path -> (asset_type_name, asset_id) for entity relationships
        path_to_type: Dict[str, str] = {}
        for item in preview_items:
            if item.path in created_assets:
                path_to_type[item.path] = item.asset_type

        for item in preview_items:
            if item.parent_path and item.parent_path in created_assets and item.path in created_assets:
                rel_type = self._relationship_type_for(item.asset_type)
                source_id = created_assets[item.parent_path]
                target_id = created_assets[item.path]
                try:
                    self._assets.add_relationship(
                        db,
                        rel_in=AssetRelationshipCreate(
                            source_asset_id=source_id,
                            target_asset_id=target_id,
                            relationship_type=rel_type,
                        ),
                        current_user_id=current_user_id,
                    )
                except Exception as exc:
                    logger.debug(f"Relationship {item.parent_path} -> {item.path}: {exc}")

                # Also write to entity_relationships so the detail page shows them
                source_type = path_to_type.get(item.parent_path, "Asset")
                target_type = path_to_type.get(item.path, "Asset")
                try:
                    existing = db.query(EntityRelationshipDb).filter(
                        EntityRelationshipDb.source_type == source_type,
                        EntityRelationshipDb.source_id == str(source_id),
                        EntityRelationshipDb.target_type == target_type,
                        EntityRelationshipDb.target_id == str(target_id),
                        EntityRelationshipDb.relationship_type == rel_type,
                    ).first()
                    if not existing:
                        db.add(EntityRelationshipDb(
                            source_type=source_type,
                            source_id=str(source_id),
                            target_type=target_type,
                            target_id=str(target_id),
                            relationship_type=rel_type,
                            created_by=current_user_id,
                        ))
                        db.flush()
                except Exception as exc:
                    logger.debug(f"Entity relationship {item.parent_path} -> {item.path}: {exc}")

        return result

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _collect_items(
        self,
        db: Session,
        connector: AssetConnector,
        path: str,
        depth: ImportDepth,
        items: List[ImportPreviewItem],
        parent_path: Optional[str],
        current_depth: int,
        _type_cache: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Recursively collect ImportPreviewItem entries for a given path."""
        seen_paths = {i.path for i in items}

        if _type_cache is None:
            _type_cache = {}

        def _get_asset_type_db(type_name: str):
            if type_name not in _type_cache:
                _type_cache[type_name] = asset_type_repo.get_by_name(db, name=type_name)
            return _type_cache[type_name]

        metadata = None
        try:
            metadata = connector.get_asset_metadata(path)
        except Exception:
            pass

        is_leaf = False

        platform = connector.connector_type

        if metadata and metadata.asset_type:
            is_leaf = metadata.asset_type.value in _LEAF_ASSET_TYPES
            mapped = _TYPE_MAP.get(metadata.asset_type.value)
            if mapped and path not in seen_paths:
                ontos_type_name = mapped[0]
                at_db = _get_asset_type_db(ontos_type_name)
                existing = None
                if at_db:
                    existing = asset_repo.get_by_identity(
                        db, name=metadata.name, asset_type_id=at_db.id,
                        platform=platform, location=path,
                    )

                items.append(ImportPreviewItem(
                    path=path,
                    name=metadata.name,
                    asset_type=ontos_type_name,
                    will_create=existing is None,
                    existing_asset_id=existing.id if existing else None,
                    parent_path=parent_path,
                ))
                seen_paths.add(path)

                if metadata.schema_info and depth != ImportDepth.SELECTED_ONLY:
                    col_type_db = _get_asset_type_db("Column")
                    for col in metadata.schema_info.columns:
                        col_path = f"{path}.{col.name}"
                        if col_path in seen_paths:
                            continue
                        col_existing = None
                        if col_type_db:
                            col_existing = asset_repo.get_by_identity(
                                db, name=col.name, asset_type_id=col_type_db.id,
                                platform=platform, location=col_path,
                            )
                        items.append(ImportPreviewItem(
                            path=col_path,
                            name=col.name,
                            asset_type="Column",
                            will_create=col_existing is None,
                            existing_asset_id=col_existing.id if col_existing else None,
                            parent_path=path,
                        ))
                        seen_paths.add(col_path)

        # Leaf assets (tables, views, routines, models) have no structural
        # children beyond columns (already extracted from schema_info above).
        # Recursing via list_assets/list_containers would re-list all siblings
        # in the parent container, causing an explosion of redundant API calls.
        if is_leaf:
            return

        should_recurse = (
            (depth == ImportDepth.ONE_LEVEL and current_depth == 0)
            or depth == ImportDepth.FULL_RECURSIVE
        )

        if should_recurse:
            try:
                options = ListAssetsOptions(path=path, limit=500)
                children = connector.list_assets(options=options)
                for child in children:
                    if child.identifier in seen_paths or child.identifier == path:
                        continue
                    child_mapped = _TYPE_MAP.get(child.asset_type.value) if child.asset_type else None
                    if child_mapped:
                        self._collect_items(
                            db=db,
                            connector=connector,
                            path=child.identifier,
                            depth=depth,
                            items=items,
                            parent_path=path,
                            current_depth=current_depth + 1,
                            _type_cache=_type_cache,
                        )
            except Exception as exc:
                logger.debug(f"Cannot list children at '{path}': {exc}")

            try:
                containers = connector.list_containers(parent_path=path)
                for c in containers:
                    c_path = c.get("path", "")
                    if c_path in seen_paths or c_path == path:
                        continue
                    c_type = c.get("type", "").lower()
                    if c_type in _CONTAINER_TYPES:
                        self._collect_items(
                            db=db,
                            connector=connector,
                            path=c_path,
                            depth=depth,
                            items=items,
                            parent_path=parent_path,
                            current_depth=current_depth + 1,
                            _type_cache=_type_cache,
                        )
            except Exception as exc:
                logger.debug(f"Cannot list containers at '{path}': {exc}")

    def _create_asset_from_item(
        self,
        db: Session,
        connector: AssetConnector,
        item: ImportPreviewItem,
        current_user_id: str,
        _type_cache: Optional[Dict[str, Any]] = None,
    ):
        """Create a single Ontos asset from a preview item."""
        if _type_cache is not None and item.asset_type in _type_cache:
            asset_type_db = _type_cache[item.asset_type]
        else:
            asset_type_db = asset_type_repo.get_by_name(db, name=item.asset_type)
            if _type_cache is not None:
                _type_cache[item.asset_type] = asset_type_db
        if not asset_type_db:
            raise ValueError(f"Ontos asset type '{item.asset_type}' not found in database")

        # Fetch rich metadata from the connector when available
        properties: Dict[str, Any] = {}
        description = None

        if item.asset_type == "Column":
            # Columns don't have get_asset_metadata — derive from parent
            properties = {"source_path": item.path}
        else:
            try:
                meta = connector.get_asset_metadata(item.path)
                if meta:
                    description = meta.description
                    if meta.schema_info:
                        properties["schema"] = {
                            "column_count": meta.schema_info.column_count,
                            "columns": [
                                {"name": c.name, "data_type": c.data_type, "nullable": c.nullable}
                                for c in (meta.schema_info.columns or [])
                            ],
                        }
                    if meta.statistics:
                        properties["statistics"] = meta.statistics.model_dump(exclude_none=True)
                    if meta.ownership:
                        properties["ownership"] = meta.ownership.model_dump(exclude_none=True)
                    if meta.tags:
                        properties["source_tags"] = meta.tags
                    properties["source_path"] = item.path
                    properties["connector_type"] = connector.connector_type
            except Exception as exc:
                logger.debug(f"Could not fetch metadata for '{item.path}': {exc}")

        asset_in = AssetCreate(
            name=item.name,
            description=description,
            asset_type_id=asset_type_db.id,
            platform=connector.connector_type,
            location=item.path,
            properties=properties or None,
            status=AssetStatus.ACTIVE,
        )

        return self._assets.create_asset(db, asset_in=asset_in, current_user_id=current_user_id)

    @staticmethod
    def _relationship_type_for(asset_type_name: str) -> str:
        """Return the ontology relationship type for a given Ontos asset type."""
        mapping = {
            "Table": "hasTable",
            "View": "hasView",
            "Column": "hasColumn",
            "Dataset": "hasDataset",
            "ML Model": "hasPart",
            "Dashboard": "hasPart",
            "System": "hasPart",
        }
        return mapping.get(asset_type_name, "hasPart")


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

def _display_type(asset_type: Optional[UnifiedAssetType]) -> str:
    """Human-friendly type label for browse nodes."""
    if asset_type is None:
        return "unknown"
    mapping = _TYPE_MAP.get(asset_type.value)
    if mapping:
        return mapping[0].lower()
    return asset_type.value.split("_")[-1].lower()


def _has_children(asset_type: Optional[UnifiedAssetType]) -> bool:
    """Whether an asset type may have child nodes (e.g., columns)."""
    if asset_type is None:
        return False
    return asset_type.value in {
        UnifiedAssetType.UC_TABLE.value,
        UnifiedAssetType.UC_VIEW.value,
        UnifiedAssetType.BQ_TABLE.value,
        UnifiedAssetType.BQ_VIEW.value,
        UnifiedAssetType.SNOWFLAKE_TABLE.value,
        UnifiedAssetType.SNOWFLAKE_VIEW.value,
    }
