"""add clase_template_id to suscripciones

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-18 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'suscripciones',
        sa.Column('clase_template_id', sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        'fk_suscripciones_clase_template_id',
        'suscripciones', 'clase_templates',
        ['clase_template_id'], ['id'],
        ondelete='RESTRICT',
    )
    op.create_index('ix_suscripciones_clase_template_id', 'suscripciones', ['clase_template_id'])


def downgrade() -> None:
    op.drop_index('ix_suscripciones_clase_template_id', table_name='suscripciones')
    op.drop_constraint('fk_suscripciones_clase_template_id', 'suscripciones', type_='foreignkey')
    op.drop_column('suscripciones', 'clase_template_id')
