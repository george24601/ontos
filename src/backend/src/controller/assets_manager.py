from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from src.repositories.assets_repository import asset_type_repo, asset_repo, asset_relationship_repo
from src.models.assets import (
    AssetTypeCreate, AssetTypeUpdate, AssetTypeRead, AssetTypeSummary,
    AssetCreate, AssetUpdate, AssetRead, AssetSummary,
    AssetRelationshipCreate, AssetRelationshipRead,
    PaginatedAssetSummary,
)
from src.db_models.assets import AssetTypeDb, AssetDb, AssetRelationshipDb
from src.common.errors import ConflictError, NotFoundError, ValidationError
from src.common.logging import get_logger
from src.common.search_interfaces import SearchableAsset, SearchIndexItem
from src.common.database import get_session_factory
from src.controller.change_log_manager import change_log_manager

logger = get_logger(__name__)

ONTOS_NS = "http://ontos.app/ontology#"


class AssetsManager(SearchableAsset):
    def __init__(self, ontology_schema_manager=None):
        self._type_repo = asset_type_repo
        self._asset_repo = asset_repo
        self._rel_repo = asset_relationship_repo
        self._ontology = ontology_schema_manager
        logger.debug("AssetsManager initialized (ontology validation=%s).", self._ontology is not None)

    # --- Helpers ---

    def _type_to_read(self, db: Session, db_type: AssetTypeDb) -> AssetTypeRead:
        """Convert DB asset type to read model with asset count."""
        read = AssetTypeRead.model_validate(db_type)
        read.asset_count = self._type_repo.get_asset_count(db, db_type.id)
        return read

    def _type_to_summary(self, db_type: AssetTypeDb) -> AssetTypeSummary:
        return AssetTypeSummary.model_validate(db_type)

    def _asset_to_read(self, db_asset: AssetDb) -> AssetRead:
        read = AssetRead.model_validate(db_asset)
        if db_asset.asset_type:
            read.asset_type_name = db_asset.asset_type.name
        # Merge source and target relationships into a single list
        rels = []
        if db_asset.source_relationships:
            rels.extend([AssetRelationshipRead.model_validate(r) for r in db_asset.source_relationships])
        if db_asset.target_relationships:
            rels.extend([AssetRelationshipRead.model_validate(r) for r in db_asset.target_relationships])
        read.relationships = rels
        return read

    # Hierarchical relationship types where source = parent, target = child
    _HIERARCHICAL_RELS = {"hasColumn", "hasTable", "hasView", "hasDataset", "hasPart", "contains"}

    def _asset_to_summary(self, db_asset: AssetDb) -> AssetSummary:
        summary = AssetSummary.model_validate(db_asset)
        if db_asset.asset_type:
            summary.asset_type_name = db_asset.asset_type.name
        if db_asset.target_relationships:
            for rel in db_asset.target_relationships:
                if rel.relationship_type in self._HIERARCHICAL_RELS and rel.source_asset:
                    summary.parent_id = rel.source_asset.id
                    summary.parent_name = rel.source_asset.name
                    break
        return summary

    # --- JSON Schema validation ---

    # Fields that live on the Asset model itself and should not be required
    # inside the free-form ``properties`` dict.
    _TOP_LEVEL_ASSET_FIELDS = frozenset({
        "name", "description", "status", "platform", "location",
        "domain_id", "tags",
    })

    def _validate_properties(self, db: Session, asset_type_id: UUID, properties: Optional[Dict[str, Any]]) -> None:
        """Validate asset properties against ontology-derived JSON Schema."""
        if not self._ontology or not properties:
            return

        db_type = self._type_repo.get(db, asset_type_id)
        if not db_type:
            return

        type_iri = f"{ONTOS_NS}{db_type.name}"
        try:
            schema_def = self._ontology.get_entity_type_schema(type_iri)
        except Exception:
            return

        if not schema_def:
            return

        json_schema = schema_def.json_schema
        if not json_schema:
            return

        import copy
        schema = copy.deepcopy(json_schema)
        schema.pop("required", None)

        try:
            import jsonschema
            jsonschema.validate(instance=properties, schema=schema)
        except jsonschema.ValidationError as e:
            raise ValidationError(
                f"Asset properties validation failed for type '{db_type.name}': {e.message}"
            )

    # --- Asset Type CRUD ---

    def create_asset_type(self, db: Session, *, type_in: AssetTypeCreate, current_user_id: str) -> AssetTypeRead:
        """Creates a new asset type."""
        existing = self._type_repo.get_by_name(db, name=type_in.name)
        if existing:
            raise ConflictError(f"Asset type '{type_in.name}' already exists.")

        data = type_in.model_dump()
        data["created_by"] = current_user_id
        db_type = AssetTypeDb(**data)

        try:
            db.add(db_type)
            db.flush()
            db.refresh(db_type)
            logger.info(f"Created asset type '{db_type.name}' (id: {db_type.id})")
            return self._type_to_read(db, db_type)
        except IntegrityError as e:
            db.rollback()
            if "unique constraint" in str(e).lower():
                raise ConflictError(f"Asset type '{type_in.name}' already exists.")
            raise

    def get_asset_type(self, db: Session, type_id: UUID) -> Optional[AssetTypeRead]:
        db_type = self._type_repo.get(db, type_id)
        if not db_type:
            return None
        return self._type_to_read(db, db_type)

    def get_all_asset_types(
        self, db: Session, *, skip: int = 0, limit: int = 100,
        category: Optional[str] = None, status: Optional[str] = None
    ) -> List[AssetTypeRead]:
        db_types = self._type_repo.get_multi_filtered(db, skip=skip, limit=limit, category=category, status=status)
        return [self._type_to_read(db, t) for t in db_types]

    def get_asset_types_summary(self, db: Session) -> List[AssetTypeSummary]:
        db_types = self._type_repo.get_multi_filtered(db, limit=1000)
        return [self._type_to_summary(t) for t in db_types]

    def update_asset_type(self, db: Session, *, type_id: UUID, type_in: AssetTypeUpdate, current_user_id: str) -> AssetTypeRead:
        db_type = self._type_repo.get(db, type_id)
        if not db_type:
            raise NotFoundError(f"Asset type '{type_id}' not found.")

        if type_in.name and type_in.name != db_type.name:
            existing = self._type_repo.get_by_name(db, name=type_in.name)
            if existing:
                raise ConflictError(f"Asset type '{type_in.name}' already exists.")

        update_data = type_in.model_dump(exclude_unset=True)
        try:
            updated = self._type_repo.update(db=db, db_obj=db_type, obj_in=update_data)
            db.flush()
            db.refresh(updated)
            logger.info(f"Updated asset type '{updated.name}' (id: {type_id})")
            return self._type_to_read(db, updated)
        except IntegrityError as e:
            db.rollback()
            if "unique constraint" in str(e).lower():
                raise ConflictError(f"Asset type name conflict.")
            raise

    def delete_asset_type(self, db: Session, *, type_id: UUID) -> AssetTypeRead:
        db_type = self._type_repo.get(db, type_id)
        if not db_type:
            raise NotFoundError(f"Asset type '{type_id}' not found.")

        # Check for existing assets of this type
        count = self._type_repo.get_asset_count(db, type_id)
        if count > 0:
            raise ConflictError(f"Cannot delete asset type '{db_type.name}': {count} assets still reference it.")

        read = self._type_to_read(db, db_type)
        self._type_repo.remove(db=db, id=type_id)
        logger.info(f"Deleted asset type '{read.name}' (id: {type_id})")
        return read

    # --- Asset CRUD ---

    def create_asset(self, db: Session, *, asset_in: AssetCreate, current_user_id: str) -> AssetRead:
        """Creates a new asset."""
        db_type = self._type_repo.get(db, asset_in.asset_type_id)
        if not db_type:
            raise NotFoundError(f"Asset type '{asset_in.asset_type_id}' not found.")

        self._validate_properties(db, asset_in.asset_type_id, asset_in.properties)

        data = asset_in.model_dump()
        data["created_by"] = current_user_id
        db_asset = AssetDb(**data)

        try:
            db.add(db_asset)
            db.flush()
            db.refresh(db_asset)
            # Reload with relationships
            db_asset = self._asset_repo.get_with_relationships(db, db_asset.id)
            logger.info(f"Created asset '{db_asset.name}' (id: {db_asset.id})")
            try:
                change_log_manager.log_change(
                    db,
                    entity_type="asset",
                    entity_id=str(db_asset.id),
                    action="created",
                    username=current_user_id,
                    details_json=f'{{"name": "{db_asset.name}", "asset_type": "{db_type.name}"}}',
                )
            except Exception as e:
                logger.warning(f"Failed to log change for asset creation: {e}")
            self._update_search_index(db_asset)
            return self._asset_to_read(db_asset)
        except IntegrityError as e:
            db.rollback()
            if "unique constraint" in str(e).lower():
                raise ConflictError(f"Asset identity conflict.")
            raise

    def get_asset(self, db: Session, asset_id: UUID) -> Optional[AssetRead]:
        db_asset = self._asset_repo.get_with_relationships(db, asset_id)
        if not db_asset:
            return None
        return self._asset_to_read(db_asset)

    def get_all_assets(
        self, db: Session, *, skip: int = 0, limit: int = 100,
        asset_type_id: Optional[UUID] = None, platform: Optional[str] = None,
        domain_id: Optional[str] = None, status: Optional[str] = None,
        name: Optional[str] = None,
    ) -> PaginatedAssetSummary:
        """Gets a paginated page of asset summaries."""
        filter_kwargs = dict(
            asset_type_id=asset_type_id, platform=platform,
            domain_id=domain_id, status=status, name=name,
        )
        db_assets = self._asset_repo.get_multi_filtered(
            db, skip=skip, limit=limit, **filter_kwargs,
        )
        total = self._asset_repo.count_filtered(db, **filter_kwargs)
        return PaginatedAssetSummary(
            items=[self._asset_to_summary(a) for a in db_assets],
            total=total,
            skip=skip,
            limit=limit,
        )

    def update_asset(self, db: Session, *, asset_id: UUID, asset_in: AssetUpdate, current_user_id: str) -> AssetRead:
        db_asset = self._asset_repo.get(db, asset_id)
        if not db_asset:
            raise NotFoundError(f"Asset '{asset_id}' not found.")

        if asset_in.asset_type_id and asset_in.asset_type_id != db_asset.asset_type_id:
            db_type = self._type_repo.get(db, asset_in.asset_type_id)
            if not db_type:
                raise NotFoundError(f"Asset type '{asset_in.asset_type_id}' not found.")

        effective_type_id = asset_in.asset_type_id or db_asset.asset_type_id
        if asset_in.properties is not None:
            self._validate_properties(db, effective_type_id, asset_in.properties)

        update_data = asset_in.model_dump(exclude_unset=True)
        try:
            updated = self._asset_repo.update(db=db, db_obj=db_asset, obj_in=update_data)
            db.flush()
            db.refresh(updated)
            updated = self._asset_repo.get_with_relationships(db, updated.id)
            logger.info(f"Updated asset '{updated.name}' (id: {asset_id})")
            try:
                change_log_manager.log_change_with_details(
                    db,
                    entity_type="asset",
                    entity_id=str(asset_id),
                    action="updated",
                    username=current_user_id,
                    details={"name": updated.name, "changed_fields": list(update_data.keys())},
                )
            except Exception as e:
                logger.warning(f"Failed to log change for asset update: {e}")
            self._update_search_index(updated)
            return self._asset_to_read(updated)
        except IntegrityError as e:
            db.rollback()
            if "unique constraint" in str(e).lower():
                raise ConflictError("Asset identity conflict.")
            raise

    def delete_asset(self, db: Session, *, asset_id: UUID, current_user_id: str = "system") -> AssetRead:
        db_asset = self._asset_repo.get_with_relationships(db, asset_id)
        if not db_asset:
            raise NotFoundError(f"Asset '{asset_id}' not found.")

        read = self._asset_to_read(db_asset)
        self._asset_repo.remove(db=db, id=asset_id)
        self._notify_index_remove(f"asset::{asset_id}")
        logger.info(f"Deleted asset '{read.name}' (id: {asset_id})")
        try:
            change_log_manager.log_change_with_details(
                db,
                entity_type="asset",
                entity_id=str(asset_id),
                action="deleted",
                username=current_user_id,
                details={"name": read.name, "asset_type": read.asset_type_name},
            )
        except Exception as e:
            logger.warning(f"Failed to log change for asset deletion: {e}")
        return read

    # --- Relationship operations ---

    def add_relationship(
        self, db: Session, *, rel_in: AssetRelationshipCreate, current_user_id: str
    ) -> AssetRelationshipRead:
        """Creates a relationship between two assets."""
        # Validate both assets exist
        src = self._asset_repo.get(db, rel_in.source_asset_id)
        if not src:
            raise NotFoundError(f"Source asset '{rel_in.source_asset_id}' not found.")
        tgt = self._asset_repo.get(db, rel_in.target_asset_id)
        if not tgt:
            raise NotFoundError(f"Target asset '{rel_in.target_asset_id}' not found.")

        existing = self._rel_repo.find_existing(
            db,
            source_asset_id=rel_in.source_asset_id,
            target_asset_id=rel_in.target_asset_id,
            relationship_type=rel_in.relationship_type,
        )
        if existing:
            raise ConflictError(f"Relationship already exists.")

        db_rel = AssetRelationshipDb(
            source_asset_id=rel_in.source_asset_id,
            target_asset_id=rel_in.target_asset_id,
            relationship_type=rel_in.relationship_type,
            properties=rel_in.properties,
            created_by=current_user_id,
        )
        db.add(db_rel)
        db.flush()
        db.refresh(db_rel)
        logger.info(f"Created relationship {rel_in.relationship_type} between {rel_in.source_asset_id} -> {rel_in.target_asset_id}")
        return AssetRelationshipRead.model_validate(db_rel)

    def remove_relationship(self, db: Session, *, relationship_id: UUID) -> bool:
        result = self._rel_repo.remove(db=db, id=relationship_id)
        if not result:
            raise NotFoundError(f"Relationship '{relationship_id}' not found.")
        logger.info(f"Removed relationship {relationship_id}")
        return True

    # ------------------------------------------------------------------
    # SearchableAsset implementation
    # ------------------------------------------------------------------

    def _build_search_index_item(self, asset_db_obj: AssetDb) -> Optional[SearchIndexItem]:
        """Convert a single asset DB object to a SearchIndexItem. Returns None for retired assets."""
        if asset_db_obj.status == 'retired':
            return None
        type_name = asset_db_obj.asset_type.name if asset_db_obj.asset_type else 'Asset'
        tags = asset_db_obj.tags if isinstance(asset_db_obj.tags, list) else []
        return SearchIndexItem(
            id=f"asset::{asset_db_obj.id}",
            type=f"asset-{type_name.lower().replace(' ', '-')}",
            title=asset_db_obj.name,
            description=asset_db_obj.description or '',
            link=f"/governance/assets/{asset_db_obj.id}",
            tags=tags,
            feature_id="assets",
            extra_data={
                "asset_type": type_name,
                "platform": asset_db_obj.platform or '',
                "status": asset_db_obj.status or '',
                "domain_id": str(asset_db_obj.domain_id) if asset_db_obj.domain_id else '',
            },
        )

    def _update_search_index(self, asset_db_obj: AssetDb) -> None:
        """Upsert a single asset in the search index."""
        item = self._build_search_index_item(asset_db_obj)
        if item is not None:
            self._notify_index_upsert(item)

    def get_search_index_items(self) -> List[SearchIndexItem]:
        """Index all active assets for unified search."""
        logger.info("AssetsManager: Fetching assets for search indexing...")
        items: List[SearchIndexItem] = []
        try:
            session_factory = get_session_factory()
            if not session_factory:
                logger.warning("Session factory not available; cannot index assets.")
                return []

            with session_factory() as db:
                all_assets = db.query(AssetDb).filter(AssetDb.status != 'retired').all()
                for a in all_assets:
                    item = self._build_search_index_item(a)
                    if item is not None:
                        items.append(item)

                logger.info(f"Indexed {len(items)} assets for search.")
        except Exception as e:
            logger.error(f"Error indexing assets: {e}", exc_info=True)
        return items


# Singleton instance
assets_manager = AssetsManager()
