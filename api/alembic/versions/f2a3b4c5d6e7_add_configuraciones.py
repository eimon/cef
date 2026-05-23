"""add configuraciones

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-05-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'configuraciones',
        sa.Column('clave', sa.String(100), primary_key=True),
        sa.Column('valor', sa.String(255), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
    )
    op.execute("INSERT INTO configuraciones (clave, valor) VALUES ('sena_minima', '0')")


def downgrade() -> None:
    op.drop_table('configuraciones')
