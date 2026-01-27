"""Fix invalid 'workflows' feature ID in role permissions

Revision ID: t0577p491rr4
Revises: s9466o380qq3
Create Date: 2026-01-27

This migration renames the invalid 'workflows' feature ID to 'process-workflows'
in all app_roles feature_permissions. The feature was renamed but some database
records may still contain the old key, causing validation errors when updating roles.

Issue: ValueError: Invalid feature ID provided in permissions: 'workflows'
Fix: Rename the JSON key from 'workflows' to 'process-workflows' in feature_permissions
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 't0577p491rr4'
down_revision: Union[str, None] = 's9466o380qq3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename 'workflows' to 'process-workflows' in all role feature_permissions."""
    conn = op.get_bind()
    
    # Check if the app_roles table exists
    result = conn.execute(sa.text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'app_roles'
        )
    """))
    table_exists = result.scalar()
    
    if not table_exists:
        # Table doesn't exist yet - skip migration
        return
    
    # Count affected rows before update
    result = conn.execute(sa.text("""
        SELECT COUNT(*) FROM app_roles 
        WHERE feature_permissions ? 'workflows'
    """))
    affected_count = result.scalar()
    
    if affected_count == 0:
        # No roles with 'workflows' key - nothing to do
        return
    
    # Rename 'workflows' key to 'process-workflows' in feature_permissions JSONB
    # This uses PostgreSQL JSONB operators:
    # - '?' checks if key exists
    # - '->' extracts value by key
    # - '-' removes a key
    # - jsonb_set() adds/updates a key
    conn.execute(sa.text("""
        UPDATE app_roles
        SET feature_permissions = jsonb_set(
            feature_permissions - 'workflows',
            '{process-workflows}',
            feature_permissions->'workflows'
        ),
        updated_at = NOW()
        WHERE feature_permissions ? 'workflows'
    """))
    
    # Log the update (will appear in Alembic output)
    print(f"  -> Fixed {affected_count} role(s) with invalid 'workflows' feature ID")


def downgrade() -> None:
    """Rename 'process-workflows' back to 'workflows' (reverses the upgrade).
    
    Note: This only affects roles that were migrated. Roles created after
    the migration with the correct 'process-workflows' key will also be renamed,
    which may not be desired. Use with caution.
    """
    conn = op.get_bind()
    
    # Check if the app_roles table exists
    result = conn.execute(sa.text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'app_roles'
        )
    """))
    table_exists = result.scalar()
    
    if not table_exists:
        return
    
    # Rename 'process-workflows' back to 'workflows'
    conn.execute(sa.text("""
        UPDATE app_roles
        SET feature_permissions = jsonb_set(
            feature_permissions - 'process-workflows',
            '{workflows}',
            feature_permissions->'process-workflows'
        ),
        updated_at = NOW()
        WHERE feature_permissions ? 'process-workflows'
    """))

