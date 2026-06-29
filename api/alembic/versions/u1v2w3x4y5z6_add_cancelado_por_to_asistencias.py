"""Add cancelado_por to asistencias

Revision ID: u1v2w3x4y5z6
Revises: t1u2v3w4x5y6
Create Date: 2026-06-29 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'u1v2w3x4y5z6'
down_revision = 't1u2v3w4x5y6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TYPE canceladopor AS ENUM ('usuario', 'sistema')")
    op.add_column(
        'asistencias',
        sa.Column(
            'cancelado_por',
            sa.Enum('usuario', 'sistema', name='canceladopor'),
            nullable=True,
        )
    )


def downgrade() -> None:
    op.drop_column('asistencias', 'cancelado_por')
    op.execute("DROP TYPE canceladopor")
