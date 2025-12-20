from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from src.common.authorization import PermissionChecker
from src.common.dependencies import DBSessionDep, AuditManagerDep, AuditCurrentUserDep
from src.common.features import FeatureAccessLevel
from src.common.logging import get_logger
from src.controller.security_manager import SecurityManager
from src.models.security import SecurityType

logger = get_logger(__name__)

router = APIRouter(prefix="/api", tags=["security"])

# Pydantic models for request/response
class SecurityRuleCreate(BaseModel):
    name: str
    description: str
    type: SecurityType
    target: str = ""
    conditions: List[str] = []

class SecurityRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[SecurityType] = None
    target: Optional[str] = None
    conditions: Optional[List[str]] = None
    status: Optional[str] = None

class SecurityRuleResponse(BaseModel):
    id: str
    name: str
    description: str
    type: SecurityType
    target: str
    conditions: List[str]
    status: str
    last_updated: str

    class Config:
        from_attributes = True

# Dependency to get security manager
def get_security_manager() -> SecurityManager:
    return SecurityManager()

@router.post("/security/rules", response_model=SecurityRuleResponse)
async def create_rule(
    rule: SecurityRuleCreate,
    request: Request,
    db: DBSessionDep,
    audit_manager: AuditManagerDep,
    current_user: AuditCurrentUserDep,
    manager: SecurityManager = Depends(get_security_manager),
    _: bool = Depends(PermissionChecker('security-features', FeatureAccessLevel.ADMIN))
) -> SecurityRuleResponse:
    """Create a new security rule"""
    success = False
    details = {
        "params": {
            "rule_name": rule.name,
            "rule_type": rule.type.value if rule.type else None,
            "target": rule.target
        }
    }
    created_rule_id = None

    try:
        new_rule = manager.create_rule(
            name=rule.name,
            description=rule.description,
            type=rule.type,
            target=rule.target,
            conditions=rule.conditions
        )
        success = True
        created_rule_id = new_rule.id
        return SecurityRuleResponse.from_orm(new_rule)
    except HTTPException as e:
        details["exception"] = {
            "type": "HTTPException",
            "status_code": e.status_code,
            "detail": e.detail
        }
        raise
    except Exception as e:
        logger.error("Failed to create security rule", exc_info=True)
        details["exception"] = {
            "type": type(e).__name__,
            "message": str(e)
        }
        raise HTTPException(status_code=400, detail="Failed to create security rule")
    finally:
        if created_rule_id:
            details["created_resource_id"] = created_rule_id
        audit_manager.log_action(
            db=db,
            username=current_user.username if current_user else "anonymous",
            ip_address=request.client.host if request.client else None,
            feature="security-features",
            action="CREATE",
            success=success,
            details=details
        )

@router.get("/security/rules", response_model=List[SecurityRuleResponse])
async def list_rules(
    request: Request,
    db: DBSessionDep,
    audit_manager: AuditManagerDep,
    current_user: AuditCurrentUserDep,
    manager: SecurityManager = Depends(get_security_manager),
    _: bool = Depends(PermissionChecker('security-features', FeatureAccessLevel.ADMIN))
) -> List[SecurityRuleResponse]:
    """List all security rules"""
    success = False
    details = {"params": {}}

    try:
        rules = manager.list_rules()
        success = True
        details["rule_count"] = len(rules)
        return [SecurityRuleResponse.from_orm(rule) for rule in rules]
    except HTTPException as e:
        details["exception"] = {
            "type": "HTTPException",
            "status_code": e.status_code,
            "detail": e.detail
        }
        raise
    except Exception as e:
        logger.error("Failed to list security rules", exc_info=True)
        details["exception"] = {
            "type": type(e).__name__,
            "message": str(e)
        }
        raise HTTPException(status_code=500, detail="Failed to list security rules")
    finally:
        audit_manager.log_action(
            db=db,
            username=current_user.username if current_user else "anonymous",
            ip_address=request.client.host if request.client else None,
            feature="security-features",
            action="LIST",
            success=success,
            details=details
        )

@router.get("/security/rules/{rule_id}", response_model=SecurityRuleResponse)
async def get_rule(
    rule_id: str,
    request: Request,
    db: DBSessionDep,
    audit_manager: AuditManagerDep,
    current_user: AuditCurrentUserDep,
    manager: SecurityManager = Depends(get_security_manager),
    _: bool = Depends(PermissionChecker('security-features', FeatureAccessLevel.ADMIN))
) -> SecurityRuleResponse:
    """Get a security rule by ID"""
    success = False
    details = {
        "params": {
            "rule_id": rule_id
        }
    }

    try:
        rule = manager.get_rule(rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        success = True
        return SecurityRuleResponse.from_orm(rule)
    except HTTPException as e:
        details["exception"] = {
            "type": "HTTPException",
            "status_code": e.status_code,
            "detail": e.detail
        }
        raise
    except Exception as e:
        logger.error("Failed to get security rule %s", rule_id, exc_info=True)
        details["exception"] = {
            "type": type(e).__name__,
            "message": str(e)
        }
        raise HTTPException(status_code=500, detail="Failed to get security rule")
    finally:
        audit_manager.log_action(
            db=db,
            username=current_user.username if current_user else "anonymous",
            ip_address=request.client.host if request.client else None,
            feature="security-features",
            action="GET",
            success=success,
            details=details
        )

@router.put("/security/rules/{rule_id}", response_model=SecurityRuleResponse)
async def update_rule(
    rule_id: str,
    rule_update: SecurityRuleUpdate,
    request: Request,
    db: DBSessionDep,
    audit_manager: AuditManagerDep,
    current_user: AuditCurrentUserDep,
    manager: SecurityManager = Depends(get_security_manager),
    _: bool = Depends(PermissionChecker('security-features', FeatureAccessLevel.ADMIN))
) -> SecurityRuleResponse:
    """Update a security rule"""
    success = False
    details = {
        "params": {
            "rule_id": rule_id,
            "updates": rule_update.dict(exclude_unset=True)
        }
    }

    try:
        updated_rule = manager.update_rule(
            rule_id=rule_id,
            name=rule_update.name,
            description=rule_update.description,
            type=rule_update.type,
            target=rule_update.target,
            conditions=rule_update.conditions,
            status=rule_update.status
        )
        if not updated_rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        success = True
        return SecurityRuleResponse.from_orm(updated_rule)
    except HTTPException as e:
        details["exception"] = {
            "type": "HTTPException",
            "status_code": e.status_code,
            "detail": e.detail
        }
        raise
    except Exception as e:
        logger.error("Failed to update security rule %s", rule_id, exc_info=True)
        details["exception"] = {
            "type": type(e).__name__,
            "message": str(e)
        }
        raise HTTPException(status_code=500, detail="Failed to update security rule")
    finally:
        audit_manager.log_action(
            db=db,
            username=current_user.username if current_user else "anonymous",
            ip_address=request.client.host if request.client else None,
            feature="security-features",
            action="UPDATE",
            success=success,
            details=details
        )

@router.delete("/security/rules/{rule_id}")
async def delete_rule(
    rule_id: str,
    request: Request,
    db: DBSessionDep,
    audit_manager: AuditManagerDep,
    current_user: AuditCurrentUserDep,
    manager: SecurityManager = Depends(get_security_manager),
    _: bool = Depends(PermissionChecker('security-features', FeatureAccessLevel.ADMIN))
) -> dict:
    """Delete a security rule"""
    success = False
    details = {
        "params": {
            "rule_id": rule_id
        }
    }

    try:
        deleted = manager.delete_rule(rule_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Rule not found")
        success = True
        return {"message": "Rule deleted successfully"}
    except HTTPException as e:
        details["exception"] = {
            "type": "HTTPException",
            "status_code": e.status_code,
            "detail": e.detail
        }
        raise
    except Exception as e:
        logger.error("Failed to delete security rule %s", rule_id, exc_info=True)
        details["exception"] = {
            "type": type(e).__name__,
            "message": str(e)
        }
        raise HTTPException(status_code=500, detail="Failed to delete security rule")
    finally:
        audit_manager.log_action(
            db=db,
            username=current_user.username if current_user else "anonymous",
            ip_address=request.client.host if request.client else None,
            feature="security-features",
            action="DELETE",
            success=success,
            details=details
        )
