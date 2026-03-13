"""API routes for LLM-based ontology generation.

Accepts table metadata and guidelines, runs an agentic LLM loop to
produce an OWL ontology in Turtle format, and returns the parsed
classes, properties, constraints, and axioms.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from src.controller.ontology_generator_manager import AgentResult, OntologyGeneratorManager
from src.models.ontology_generator import (
    AgentStepResponse,
    GenerateFromConnectionRequest,
    GenerateOntologyRequest,
    GenerateOntologyResponse,
    OntologyClassResponse,
    OntologyInfoResponse,
    OntologyPropertyResponse,
    SaveToCollectionRequest,
    SaveToCollectionResponse,
)
from src.common.authorization import PermissionChecker
from src.common.features import FeatureAccessLevel
from src.common.dependencies import (
    DBSessionDep,
    AuditManagerDep,
    AuditCurrentUserDep,
    OntologyGeneratorManagerDep,
)
from src.common.manager_dependencies import (
    get_ontology_generator_manager,
    get_semantic_models_manager,
)
from src.common.workspace_client import get_obo_workspace_client
from src.common.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/ontology", tags=["Ontology Generator"])
FEATURE_ID = "ontology"


def _get_user_token(request: Request) -> Optional[str]:
    """Extract the OBO token from request headers (None in local dev)."""
    return request.headers.get("x-forwarded-access-token")


def _build_response(result: AgentResult) -> GenerateOntologyResponse:
    """Convert an ``AgentResult`` to the API response model."""
    return GenerateOntologyResponse(
        success=result.success,
        owl_content=result.owl_content,
        classes=[OntologyClassResponse(**c) for c in result.classes],
        properties=[OntologyPropertyResponse(**p) for p in result.properties],
        ontology_info=(
            OntologyInfoResponse(**result.ontology_info)
            if result.ontology_info
            else OntologyInfoResponse()
        ),
        constraints=result.constraints,
        axioms=result.axioms,
        steps=[
            AgentStepResponse(
                step_type=s.step_type,
                content=s.content,
                tool_name=s.tool_name,
                duration_ms=s.duration_ms,
            )
            for s in result.steps
        ],
        iterations=result.iterations,
        error=result.error,
        usage=result.usage,
    )


@router.post(
    "/generate",
    response_model=GenerateOntologyResponse,
    summary="Generate an OWL ontology from table metadata using an LLM agent",
    dependencies=[Depends(PermissionChecker(FEATURE_ID, FeatureAccessLevel.READ_WRITE))],
)
def generate_ontology(
    request: Request,
    body: GenerateOntologyRequest,
    db: DBSessionDep = None,
    audit_manager: AuditManagerDep = None,
    current_user: AuditCurrentUserDep = None,
    manager: OntologyGeneratorManagerDep = None,
):
    """Run the ontology-generation agent and return structured results."""
    success = False
    details = {
        "table_count": len(body.metadata.tables),
        "guidelines_length": len(body.guidelines),
        "base_uri": body.base_uri,
    }

    try:
        metadata_dict = {"tables": [t.model_dump() for t in body.metadata.tables]}

        options = {
            "includeDataProperties": body.include_data_properties,
            "includeRelationships": body.include_relationships,
            "includeInheritance": body.include_inheritance,
        }

        result = manager.generate_ontology(
            metadata=metadata_dict,
            guidelines=body.guidelines,
            options=options,
            base_uri=body.base_uri,
            selected_tables=body.selected_tables,
            user_token=_get_user_token(request),
        )

        success = result.success
        details["iterations"] = result.iterations
        details["classes_count"] = len(result.classes)
        details["properties_count"] = len(result.properties)
        details["owl_content_length"] = len(result.owl_content)
        if result.error:
            details["error"] = result.error

        return _build_response(result)

    except Exception as e:
        logger.exception("Failed to generate ontology")
        details["exception"] = {"type": type(e).__name__, "message": str(e)}
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ontology generation failed: {e}",
        )
    finally:
        audit_manager.log_action(
            db=db,
            username=current_user.username,
            ip_address=request.client.host if request.client else None,
            feature=FEATURE_ID,
            action="GENERATE_ONTOLOGY",
            success=success,
            details=details,
        )


@router.post(
    "/generate-from-connection",
    response_model=GenerateOntologyResponse,
    summary="Generate an OWL ontology from a connection's selected tables",
    dependencies=[Depends(PermissionChecker(FEATURE_ID, FeatureAccessLevel.READ_WRITE))],
)
def generate_from_connection(
    request: Request,
    body: GenerateFromConnectionRequest,
    db: DBSessionDep = None,
    audit_manager: AuditManagerDep = None,
    current_user: AuditCurrentUserDep = None,
    manager: OntologyGeneratorManagerDep = None,
):
    """Fetch table metadata via a connection, then generate an OWL ontology."""
    success = False
    details = {
        "connection_id": body.connection_id,
        "selected_count": len(body.selected_paths),
        "guidelines_length": len(body.guidelines),
    }

    try:
        from src.controller.connections_manager import ConnectionsManager

        ws = get_obo_workspace_client(request)
        conn_mgr = ConnectionsManager(db=db, workspace_client=ws)

        connector = conn_mgr.get_connector_for_connection(UUID(body.connection_id))
        if connector is None:
            raise HTTPException(status_code=404, detail="Connection not found")

        tables_metadata = OntologyGeneratorManager.resolve_tables_from_connector(
            connector, body.selected_paths,
        )

        if not tables_metadata:
            raise HTTPException(
                status_code=400,
                detail="No tables with schema found in the selected paths",
            )

        details["resolved_tables"] = len(tables_metadata)

        options = {
            "includeDataProperties": body.include_data_properties,
            "includeRelationships": body.include_relationships,
            "includeInheritance": body.include_inheritance,
        }

        result = manager.generate_ontology(
            metadata={"tables": tables_metadata},
            guidelines=body.guidelines,
            options=options,
            base_uri=body.base_uri,
            user_token=_get_user_token(request),
        )

        success = result.success
        details["iterations"] = result.iterations
        details["classes_count"] = len(result.classes)
        details["properties_count"] = len(result.properties)

        return _build_response(result)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to generate ontology from connection")
        details["exception"] = {"type": type(e).__name__, "message": str(e)}
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ontology generation failed: {e}",
        )
    finally:
        audit_manager.log_action(
            db=db,
            username=current_user.username,
            ip_address=request.client.host if request.client else None,
            feature=FEATURE_ID,
            action="GENERATE_ONTOLOGY_FROM_CONNECTION",
            success=success,
            details=details,
        )


@router.post(
    "/save-to-collection",
    response_model=SaveToCollectionResponse,
    summary="Save generated OWL Turtle as a new Concept Collection",
    dependencies=[Depends(PermissionChecker(FEATURE_ID, FeatureAccessLevel.READ_WRITE))],
)
def save_to_collection(
    request: Request,
    body: SaveToCollectionRequest,
    db: DBSessionDep = None,
    audit_manager: AuditManagerDep = None,
    current_user: AuditCurrentUserDep = None,
):
    """Create a new Concept Collection of type 'ontology' and load
    the generated Turtle triples into it.
    """
    success = False
    details = {
        "collection_name": body.collection_name,
        "content_length": len(body.owl_content),
    }

    try:
        sm_manager = get_semantic_models_manager(request)

        collection = sm_manager.create_collection(
            label=body.collection_name,
            collection_type="ontology",
            scope_level="enterprise",
            description=body.collection_description or f"Generated ontology: {body.collection_name}",
            is_editable=True,
            created_by=current_user.email,
        )

        collection_iri = collection["iri"]
        details["collection_iri"] = collection_iri

        count = sm_manager.import_rdf_to_collection(
            collection_iri=collection_iri,
            content=body.owl_content,
            format="turtle",
            imported_by=current_user.email,
        )

        success = True
        details["triples_imported"] = count

        return SaveToCollectionResponse(
            success=True,
            collection_iri=collection_iri,
            triples_imported=count,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to save ontology to collection")
        details["exception"] = {"type": type(e).__name__, "message": str(e)}
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save to collection: {e}",
        )
    finally:
        audit_manager.log_action(
            db=db,
            username=current_user.username,
            ip_address=request.client.host if request.client else None,
            feature=FEATURE_ID,
            action="SAVE_ONTOLOGY_TO_COLLECTION",
            success=success,
            details=details,
        )


def register_routes(app):
    app.include_router(router)
    logger.info("Ontology generator routes registered with prefix /api/ontology")
