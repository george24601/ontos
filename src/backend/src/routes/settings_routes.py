from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime

from databricks.sdk import WorkspaceClient
from fastapi import APIRouter, Depends, HTTPException, status, Body, Request, BackgroundTasks
from sqlalchemy.orm import Session

from ..common.workspace_client import get_workspace_client
from ..controller.settings_manager import SettingsManager
from ..models.settings import AppRole, AppRoleCreate, JobCluster
from ..common.database import get_db
from ..common.dependencies import (
    get_settings_manager,
    get_notifications_manager,
    get_change_log_manager,
    AuditManagerDep,
    AuditCurrentUserDep,
    DBSessionDep,
)
from ..models.settings import HandleRoleRequest
from ..models.notifications import Notification, NotificationType
from ..controller.notifications_manager import NotificationsManager
from ..common.config import get_settings
from ..common.sanitization import sanitize_markdown_input

# Configure logging
from src.common.logging import get_logger
logger = get_logger(__name__)

router = APIRouter(prefix="/api", tags=["settings"])

SETTINGS_FEATURE_ID = "settings" # Define a feature ID for settings

@router.get('/settings')
async def get_settings_route(manager: SettingsManager = Depends(get_settings_manager)):
    """Get all settings including available job clusters"""
    try:
        settings_data = manager.get_settings() # Renamed variable to avoid conflict
        return settings_data
    except Exception as e:
        logger.error("Error getting settings", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get settings")

@router.put('/settings')
async def update_settings(
    request: Request,
    background_tasks: BackgroundTasks,
    db: DBSessionDep,
    audit_manager: AuditManagerDep,
    current_user: AuditCurrentUserDep,
    settings_payload: dict, # Renamed to avoid conflict with module
    manager: SettingsManager = Depends(get_settings_manager)
):
    """Update settings"""
    success = False
    details = {}
    try:
        logger.info(f"Received settings update request: {settings_payload}")
        logger.info(f"job_cluster_id in payload: {settings_payload.get('job_cluster_id')}")

        # Track what settings changed
        if 'job_cluster_id' in settings_payload:
            details['job_cluster_id'] = settings_payload.get('job_cluster_id')
        if 'sync_enabled' in settings_payload:
            details['sync_enabled'] = settings_payload.get('sync_enabled')
        if 'sync_repository' in settings_payload:
            details['sync_repository'] = settings_payload.get('sync_repository')
        if 'enabled_jobs' in settings_payload:
            details['enabled_jobs'] = settings_payload.get('enabled_jobs')

        updated = manager.update_settings(settings_payload)
        success = True
        return updated.to_dict()
    except Exception as e:
        logger.error("Error updating settings", exc_info=True)
        details['exception'] = str(e)
        raise HTTPException(status_code=500, detail="Failed to update settings")
    finally:
        background_tasks.add_task(
            audit_manager.log_action_background,
            username=current_user.username,
            ip_address=request.client.host if request.client else None,
            feature=SETTINGS_FEATURE_ID,
            action="UPDATE",
            success=success,
            details=details
        )

@router.get('/settings/llm')
async def get_llm_config():
    """Get LLM configuration (publicly accessible for UI)"""
    try:
        app_settings = get_settings()
        return {
            "enabled": app_settings.LLM_ENABLED,
            "endpoint": app_settings.LLM_ENDPOINT,
            "disclaimer_text": sanitize_markdown_input(app_settings.LLM_DISCLAIMER_TEXT) if app_settings.LLM_DISCLAIMER_TEXT else None,
            # Do not expose system_prompt or injection_check_prompt to frontend
        }
    except Exception as e:
        logger.error("Error getting LLM config", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get LLM config")

@router.get('/settings/health')
async def health_check(manager: SettingsManager = Depends(get_settings_manager)):
    """Check if the settings API is healthy"""
    try:
        manager.list_available_workflows()
        logger.info("Workflows health check successful")
        return {"status": "healthy"}
    except Exception as e:
        error_msg = f"Workflows health check failed: {e!s}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@router.get('/settings/job-clusters', response_model=List[JobCluster])
async def list_job_clusters(manager: SettingsManager = Depends(get_settings_manager)):
    """List all available job clusters"""
    try:
        return manager.get_job_clusters()
    except Exception as e:
        logger.error("Error fetching job clusters", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch job clusters")

# --- RBAC Routes ---

@router.get("/settings/features", response_model=Dict[str, Dict[str, Any]])
async def get_features_config(manager: SettingsManager = Depends(get_settings_manager)):
    """Get the application feature configuration including allowed access levels."""
    try:
        features = manager.get_features_with_access_levels()
        return features
    except Exception as e:
        logger.error("Error getting features configuration", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get features configuration")

@router.get("/settings/roles", response_model=List[AppRole])
async def list_roles(manager: SettingsManager = Depends(get_settings_manager)):
    """List all application roles."""
    try:
        roles = manager.list_app_roles()
        return roles
    except Exception as e:
        logger.error("Error listing roles", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list roles")

@router.get("/settings/roles/summary", response_model=List[dict])
async def list_roles_summary(manager: SettingsManager = Depends(get_settings_manager)):
    """Get a simple summary list of role names for dropdowns/selection."""
    try:
        roles = manager.list_app_roles()
        return [{"name": role.name} for role in roles]
    except Exception as e:
        logger.error("Error listing roles summary", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list roles summary")

@router.post("/settings/roles", response_model=AppRole, status_code=status.HTTP_201_CREATED)
async def create_role(
    request: Request,
    background_tasks: BackgroundTasks,
    db: DBSessionDep,
    audit_manager: AuditManagerDep,
    current_user: AuditCurrentUserDep,
    role_data: AppRoleCreate = Body(..., embed=False),
    manager: SettingsManager = Depends(get_settings_manager)
):
    """Create a new application role."""
    success = False
    details = {"role_name": role_data.name}
    try:
        created_role = manager.create_app_role(role=role_data)
        success = True
        if created_role and hasattr(created_role, 'id'):
            details["created_role_id"] = str(created_role.id)
        return created_role
    except ValueError as e:
        logger.warning("Validation error creating role '%s': %s", role_data.name, e)
        details["exception"] = str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role data")
    except Exception as e:
        logger.error("Error creating role '%s'", role_data.name, exc_info=True)
        details["exception"] = str(e)
        raise HTTPException(status_code=500, detail="Failed to create role")
    finally:
        background_tasks.add_task(
            audit_manager.log_action_background,
            username=current_user.username,
            ip_address=request.client.host if request.client else None,
            feature=SETTINGS_FEATURE_ID,
            action="CREATE",
            success=success,
            details=details
        )

@router.get("/settings/roles/{role_id}", response_model=AppRole)
async def get_role(
    role_id: str,
    manager: SettingsManager = Depends(get_settings_manager)
):
    """Get a specific application role by ID."""
    try:
        role = manager.get_app_role(role_id)
        if role is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
        return role
    except Exception as e:
        logger.error("Error getting role %s", role_id, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get role")

@router.put("/settings/roles/{role_id}", response_model=AppRole)
async def update_role(
    role_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: DBSessionDep,
    audit_manager: AuditManagerDep,
    current_user: AuditCurrentUserDep,
    role_data: AppRole = Body(..., embed=False),
    manager: SettingsManager = Depends(get_settings_manager)
):
    """Update an existing application role."""
    success = False
    details = {"role_id": role_id, "role_name": role_data.name}
    try:
        updated_role = manager.update_app_role(role_id, role_data)
        if updated_role is None:
            details["exception"] = "Role not found"
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
        success = True
        return updated_role
    except ValueError as e:
        logger.warning("Validation error updating role %s: %s", role_id, e)
        details["exception"] = str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role data")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating role %s", role_id, exc_info=True)
        details["exception"] = str(e)
        raise HTTPException(status_code=500, detail="Failed to update role")
    finally:
        background_tasks.add_task(
            audit_manager.log_action_background,
            username=current_user.username,
            ip_address=request.client.host if request.client else None,
            feature=SETTINGS_FEATURE_ID,
            action="UPDATE",
            success=success,
            details=details
        )

@router.delete("/settings/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: DBSessionDep,
    audit_manager: AuditManagerDep,
    current_user: AuditCurrentUserDep,
    manager: SettingsManager = Depends(get_settings_manager)
):
    """Delete an application role."""
    success = False
    details = {"deleted_role_id": role_id}
    try:
        deleted = manager.delete_app_role(role_id)
        if not deleted:
            details["exception"] = "Role not found"
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
        success = True
        return None # Return None for 204
    except ValueError as e: # Catch potential error like deleting admin role
        logger.warning("Error deleting role %s: %s", role_id, e)
        details["exception"] = str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete role")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting role %s", role_id, exc_info=True)
        details["exception"] = str(e)
        raise HTTPException(status_code=500, detail="Failed to delete role")
    finally:
        background_tasks.add_task(
            audit_manager.log_action_background,
            username=current_user.username,
            ip_address=request.client.host if request.client else None,
            feature=SETTINGS_FEATURE_ID,
            action="DELETE",
            success=success,
            details=details
        )

# --- Role Request Handling ---
@router.post("/settings/roles/handle-request", status_code=status.HTTP_200_OK)
async def handle_role_request_decision(
    request_data: HandleRoleRequest = Body(...),
    db: Session = Depends(get_db),
    settings_manager: SettingsManager = Depends(get_settings_manager),
    notifications_manager: NotificationsManager = Depends(get_notifications_manager),
    change_log_manager = Depends(get_change_log_manager)
):
    """Handles the admin decision (approve/deny) for a role access request."""
    try:
        # Delegate to manager
        result = settings_manager.handle_role_request_decision(
            db=db,
            request_data=request_data,
            notifications_manager=notifications_manager,
            change_log_manager=change_log_manager
        )
        return result
    except ValueError as e:
        # Role not found
        logger.error(f"Role validation error: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error handling role request decision: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process role request decision due to an internal error.")

# --- Demo Data Loading ---

@router.post("/settings/demo-data/load", status_code=status.HTTP_200_OK)
async def load_demo_data(
    request: Request,
    background_tasks: BackgroundTasks,
    db: DBSessionDep,
    audit_manager: AuditManagerDep,
    current_user: AuditCurrentUserDep,
    manager: SettingsManager = Depends(get_settings_manager)
):
    """
    Load demo data from SQL file into the database.
    
    This endpoint is Admin-only and loads all demo/example data including:
    - Data Domains
    - Teams and Team Members
    - Projects
    - Data Contracts with schemas
    - Data Products with ports
    - Data Asset Reviews
    - Notifications
    - Compliance Policies and Runs
    - Cost Items
    - Semantic Links
    - Metadata (notes, links, documents)
    
    The SQL uses ON CONFLICT DO NOTHING to avoid duplicate key errors on re-runs.
    """
    success = False
    details = {"action": "load_demo_data"}
    
    try:
        from pathlib import Path
        from sqlalchemy import text
        
        # Locate the demo data SQL file
        data_dir = Path(__file__).parent.parent / "data"
        sql_file = data_dir / "demo_data.sql"
        
        if not sql_file.exists():
            details["exception"] = "demo_data.sql not found"
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Demo data SQL file not found at {sql_file}"
            )
        
        # Read and execute the SQL file
        sql_content = sql_file.read_text(encoding="utf-8")
        
        # Execute the SQL within a transaction
        # The SQL file already has BEGIN/COMMIT, so we need to handle it appropriately
        # For SQLAlchemy, we'll use raw connection execution
        connection = db.connection()
        
        # Split by semicolons and execute each statement
        # This is safer than executing the entire file at once
        statements = []
        current_statement = []
        in_dollar_quote = False
        
        for line in sql_content.split('\n'):
            stripped = line.strip()
            
            # Skip empty lines and comments at statement level
            if not stripped or stripped.startswith('--'):
                if current_statement:  # Keep comments within statements
                    current_statement.append(line)
                continue
            
            # Track dollar-quoted strings (for E'' strings with newlines)
            if "E'" in line or "$$" in line:
                in_dollar_quote = not in_dollar_quote if "$$" in line else in_dollar_quote
            
            current_statement.append(line)
            
            # Check if this line ends a statement
            if stripped.endswith(';') and not in_dollar_quote:
                full_statement = '\n'.join(current_statement).strip()
                if full_statement and not full_statement.startswith('--'):
                    # Skip BEGIN/COMMIT as SQLAlchemy manages transactions
                    if full_statement.upper() not in ('BEGIN;', 'COMMIT;'):
                        statements.append(full_statement)
                current_statement = []
        
        # Execute all statements
        executed_count = 0
        for stmt in statements:
            if stmt.strip():
                try:
                    connection.execute(text(stmt))
                    executed_count += 1
                except Exception as stmt_error:
                    logger.warning(f"Statement execution warning: {stmt_error}")
                    # Continue with other statements - ON CONFLICT should handle duplicates
        
        db.commit()
        
        success = True
        details["statements_executed"] = executed_count
        
        logger.info(f"Demo data loaded successfully. Executed {executed_count} statements.")
        
        return {
            "status": "success",
            "message": f"Demo data loaded successfully. Executed {executed_count} SQL statements.",
            "statements_executed": executed_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error loading demo data", exc_info=True)
        details["exception"] = str(e)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load demo data: {str(e)}"
        )
    finally:
        background_tasks.add_task(
            audit_manager.log_action_background,
            username=current_user.username,
            ip_address=request.client.host if request.client else None,
            feature=SETTINGS_FEATURE_ID,
            action="LOAD_DEMO_DATA",
            success=success,
            details=details
        )


@router.delete("/settings/demo-data", status_code=status.HTTP_200_OK)
async def clear_demo_data(
    request: Request,
    background_tasks: BackgroundTasks,
    db: DBSessionDep,
    audit_manager: AuditManagerDep,
    current_user: AuditCurrentUserDep,
    manager: SettingsManager = Depends(get_settings_manager)
):
    """
    Clear all demo data from the database.
    
    This endpoint is Admin-only and removes all demo data that was loaded
    via the /settings/demo-data/load endpoint.
    
    WARNING: This will delete all data with IDs matching the demo data patterns.
    """
    success = False
    details = {"action": "clear_demo_data"}
    
    try:
        from sqlalchemy import text
        
        # Delete in reverse dependency order
        delete_statements = [
            # Metadata
            "DELETE FROM document_metadata WHERE id::text LIKE 'md00000%'",
            "DELETE FROM link_metadata WHERE id::text LIKE 'ml00000%'",
            "DELETE FROM rich_text_metadata WHERE id::text LIKE 'mt00000%'",
            
            # Semantic Links
            "DELETE FROM entity_semantic_links WHERE id::text LIKE 'sl00000%'",
            
            # Cost Items
            "DELETE FROM cost_items WHERE id::text LIKE 'ct00000%'",
            
            # Compliance
            "DELETE FROM compliance_results WHERE id LIKE 'cx00000%'",
            "DELETE FROM compliance_runs WHERE id LIKE 'cr00000%'",
            "DELETE FROM compliance_policies WHERE id LIKE 'cp00000%'",
            
            # Notifications
            "DELETE FROM notifications WHERE id LIKE 'nt00000%'",
            
            # Reviews
            "DELETE FROM reviewed_assets WHERE id LIKE 'ra00000%'",
            "DELETE FROM data_asset_review_requests WHERE id LIKE 'rv00000%'",
            
            # Data Products (child tables first)
            "DELETE FROM data_product_team_members WHERE id LIKE 'pm00000%'",
            "DELETE FROM data_product_teams WHERE id LIKE 'pt00000%'",
            "DELETE FROM data_product_support_channels WHERE id LIKE 'sc00000%'",
            "DELETE FROM data_product_input_ports WHERE id LIKE 'ip00000%'",
            "DELETE FROM data_product_output_ports WHERE id LIKE 'op00000%'",
            "DELETE FROM data_product_descriptions WHERE id LIKE 'dd00000%'",
            "DELETE FROM data_products WHERE id LIKE 'dp00000%'",
            
            # Data Contracts (child tables first)
            "DELETE FROM data_contract_schema_properties WHERE id LIKE 'sp00000%'",
            "DELETE FROM data_contract_schema_objects WHERE id LIKE 'so00000%'",
            "DELETE FROM data_contracts WHERE id LIKE 'dc00000%'",
            
            # Projects
            "DELETE FROM project_teams WHERE project_id LIKE 'pj00000%'",
            "DELETE FROM projects WHERE id LIKE 'pj00000%'",
            
            # Teams
            "DELETE FROM team_members WHERE id LIKE 'mb00000%'",
            "DELETE FROM teams WHERE id LIKE 'tm00000%'",
            
            # Domains (children first)
            "DELETE FROM data_domains WHERE id LIKE 'dd00001%'",  # Level 2
            "DELETE FROM data_domains WHERE id LIKE 'dd00000%'",  # Level 0-1
        ]
        
        deleted_counts = {}
        for stmt in delete_statements:
            try:
                result = db.execute(text(stmt))
                table_name = stmt.split("FROM ")[1].split(" ")[0]
                deleted_counts[table_name] = result.rowcount
            except Exception as e:
                logger.warning(f"Delete statement warning: {e}")
        
        db.commit()
        
        success = True
        details["deleted_counts"] = deleted_counts
        
        total_deleted = sum(deleted_counts.values())
        logger.info(f"Demo data cleared. Deleted {total_deleted} records.")
        
        return {
            "status": "success",
            "message": f"Demo data cleared. Deleted {total_deleted} records.",
            "deleted_counts": deleted_counts
        }
        
    except Exception as e:
        logger.error("Error clearing demo data", exc_info=True)
        details["exception"] = str(e)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear demo data: {str(e)}"
        )
    finally:
        background_tasks.add_task(
            audit_manager.log_action_background,
            username=current_user.username,
            ip_address=request.client.host if request.client else None,
            feature=SETTINGS_FEATURE_ID,
            action="CLEAR_DEMO_DATA",
            success=success,
            details=details
        )


# --- Registration --- 

def register_routes(app):
    """Register routes with the app"""
    app.include_router(router)
    logger.info("Settings routes registered")


# --- Compliance mapping (object-type policies) ---

@router.get('/settings/compliance-mapping')
async def get_compliance_mapping():
    """Return compliance mapping YAML content as JSON.

    See structure documented in self_service_routes._load_compliance_mapping.
    """
    try:
        from src.common.config import get_config_manager
        cfg = get_config_manager()
        data = cfg.load_yaml('compliance_mapping.yaml')
        return data or {}
    except FileNotFoundError:
        return {}
    except Exception as e:
        logger.error("Error loading compliance mapping", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load compliance mapping")


@router.put('/settings/compliance-mapping')
async def save_compliance_mapping(
    payload: Dict[str, Any] = Body(...),
    manager: SettingsManager = Depends(get_settings_manager)
):
    """Persist compliance mapping to YAML."""
    try:
        from src.common.config import get_config_manager
        cfg = get_config_manager()
        cfg.save_yaml('compliance_mapping.yaml', payload)
        return {"status": "ok"}
    except Exception as e:
        logger.error("Error saving compliance mapping", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save compliance mapping")


# --- Documentation System ---

@router.get('/user-docs')
async def list_available_docs(manager: SettingsManager = Depends(get_settings_manager)):
    """List all available user documentation files"""
    try:
        docs = manager.get_available_docs()
        # Return without the internal 'path' field
        result = {}
        for doc_key, doc_info in docs.items():
            entry = {
                "title": doc_info["title"],
                "description": doc_info["description"],
                "file": doc_info["file"]
            }
            # Include optional category field if present
            if "category" in doc_info:
                entry["category"] = doc_info["category"]
            result[doc_key] = entry
        return result
    except Exception as e:
        logger.error("Error listing documentation", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list documentation")

@router.get('/user-docs/{doc_name}')
async def get_documentation(doc_name: str, manager: SettingsManager = Depends(get_settings_manager)):
    """Serve a specific user documentation file by name"""
    try:
        return manager.get_documentation_content(doc_name)
    except ValueError as e:
        # Doc not found in registry
        logger.warning(f"Documentation not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Error reading documentation '%s'", doc_name, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to read documentation")

@router.get('/user-guide')
async def get_user_guide(manager: SettingsManager = Depends(get_settings_manager)):
    """Serve the USER-GUIDE.md content (alias for /user-docs/user-guide for backward compatibility)"""
    return await get_documentation("user-guide", manager)


# --- Database Schema ERD ---

@router.get('/database-schema')
async def get_database_schema(manager: SettingsManager = Depends(get_settings_manager)):
    """Extract database schema from SQLAlchemy models for ERD visualization"""
    try:
        return manager.extract_database_schema()
    except Exception as e:
        logger.error("Error extracting database schema", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to extract database schema")
