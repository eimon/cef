"""asistio default false

Revision ID: l2m3n4o5p6q7
Revises: k1l2m3n4o5p6
Create Date: 2026-06-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'l2m3n4o5p6q7'
down_revision = 'k1l2m3n4o5p6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Change server default to false for new rows
    op.alter_column(
        'asistencias',
        'asistio',
        server_default=sa.false(),
        existing_type=sa.Boolean(),
        existing_nullable=True,
    )
    # Mark all past asistencias as attended (preserve historical behavior)
    op.execute(
        """
        UPDATE asistencias
        SET asistio = true
        WHERE clase_instancia_id IN (
            SELECT id FROM clase_instancias WHERE fecha < CURRENT_DATE
        )
        """
    )


def downgrade() -> None:
    op.alter_column(
        'asistencias',
        'asistio',
        server_default=sa.true(),
        existing_type=sa.Boolean(),
        existing_nullable=True,
    )
