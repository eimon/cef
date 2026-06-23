"""allow multiple fichas medicas per user

Revision ID: m1n2o3p4q5r6
Revises: l2m3n4o5p6q7
Create Date: 2026-06-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'm1n2o3p4q5r6'
down_revision: Union[str, None] = 'l2m3n4o5p6q7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(op.f('ix_fichas_medicas_usuario_id'), table_name='fichas_medicas')
    op.create_index(op.f('ix_fichas_medicas_usuario_id'), 'fichas_medicas', ['usuario_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_fichas_medicas_usuario_id'), table_name='fichas_medicas')
    op.create_index(op.f('ix_fichas_medicas_usuario_id'), 'fichas_medicas', ['usuario_id'], unique=True)
