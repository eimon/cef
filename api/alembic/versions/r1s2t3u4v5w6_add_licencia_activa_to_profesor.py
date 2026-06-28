"""Add licencia_activa_id to profesor

Revision ID: r1s2t3u4v5w6
Revises: q1r2s3t4u5v6
Create Date: 2026-06-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'r1s2t3u4v5w6'
down_revision = 'q1r2s3t4u5v6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('profesores', sa.Column('licencia_activa_id', sa.UUID(), nullable=True))
    op.create_index('ix_profesores_licencia_activa_id', 'profesores', ['licencia_activa_id'], unique=False)
    op.create_foreign_key(
        'profesores_licencia_activa_id_fkey',
        'profesores',
        'licencias',
        ['licencia_activa_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('profesores_licencia_activa_id_fkey', 'profesores', type_='foreignkey')
    op.drop_index('ix_profesores_licencia_activa_id', table_name='profesores')
    op.drop_column('profesores', 'licencia_activa_id')
