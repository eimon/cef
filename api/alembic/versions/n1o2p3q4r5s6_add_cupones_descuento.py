"""add cupones_descuento table

Revision ID: n1o2p3q4r5s6
Revises: m1n2o3p4q5r6
Create Date: 2026-06-18 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = 'n1o2p3q4r5s6'
down_revision: Union[str, None] = 'm1n2o3p4q5r6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'cupones_descuento',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('suscripcion_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('suscripciones.id', ondelete='CASCADE'), nullable=False),
        sa.Column('descuento_porcentaje', sa.Numeric(5, 2), nullable=False),
        sa.Column('usado', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_cupones_descuento_id', 'cupones_descuento', ['id'])
    op.create_index('ix_cupones_descuento_suscripcion_id', 'cupones_descuento', ['suscripcion_id'])


def downgrade() -> None:
    op.drop_index('ix_cupones_descuento_suscripcion_id', table_name='cupones_descuento')
    op.drop_index('ix_cupones_descuento_id', table_name='cupones_descuento')
    op.drop_table('cupones_descuento')
