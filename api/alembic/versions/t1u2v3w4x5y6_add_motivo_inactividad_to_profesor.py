"""Add motivo_inactividad to profesor

Revision ID: t1u2v3w4x5y6
Revises: s1t2u3v4w5x6
Create Date: 2026-06-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 't1u2v3w4x5y6'
down_revision = 's1t2u3v4w5x6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('profesores', sa.Column('motivo_inactividad', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('profesores', 'motivo_inactividad')
