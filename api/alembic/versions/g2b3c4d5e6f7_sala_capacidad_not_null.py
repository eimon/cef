"""sala capacidad not null

Revision ID: g2b3c4d5e6f7
Revises: f2a3b4c5d6e7
Create Date: 2026-06-08

"""
from alembic import op
import sqlalchemy as sa

revision = 'g2b3c4d5e6f7'
down_revision = 'f2a3b4c5d6e7'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('salas', 'capacidad', existing_type=sa.Integer(), nullable=False)


def downgrade():
    op.alter_column('salas', 'capacidad', existing_type=sa.Integer(), nullable=True)
