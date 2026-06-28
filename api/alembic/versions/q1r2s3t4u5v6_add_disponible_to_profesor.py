"""Add disponible to profesor

Revision ID: q1r2s3t4u5v6
Revises: p1q2r3s4t5u6v7w8x9y0
Create Date: 2026-06-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'q1r2s3t4u5v6'
down_revision = 'p1q2r3s4t5u6v7w8x9y0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'profesores',
        sa.Column('disponible', sa.Boolean(), nullable=False, server_default=sa.text('true')),
    )


def downgrade() -> None:
    op.drop_column('profesores', 'disponible')
