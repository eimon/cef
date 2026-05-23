"""add historial_precios

Revision ID: e1f2a3b4c5d6
Revises: c1d2e3f4a5b6
Create Date: 2026-05-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'historial_precios',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('clase_template_id', UUID(as_uuid=True), sa.ForeignKey('clase_templates.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('tipo', sa.String(20), nullable=False),
        sa.Column('precio_anterior', sa.Numeric(10, 2), nullable=False),
        sa.Column('precio_nuevo', sa.Numeric(10, 2), nullable=False),
        sa.Column('fecha_cambio', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('historial_precios')
