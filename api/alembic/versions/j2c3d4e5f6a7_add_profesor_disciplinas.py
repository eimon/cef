"""add profesor_disciplinas

Revision ID: j2c3d4e5f6a7
Revises: i1b2c3d4e5f6
Create Date: 2026-06-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'j2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'i1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'profesor_disciplinas',
        sa.Column('profesor_id', UUID(as_uuid=True), sa.ForeignKey('profesores.id', ondelete='CASCADE'), primary_key=True, nullable=False),
        sa.Column('disciplina_id', UUID(as_uuid=True), sa.ForeignKey('disciplinas.id', ondelete='CASCADE'), primary_key=True, nullable=False),
    )


def downgrade() -> None:
    op.drop_table('profesor_disciplinas')
