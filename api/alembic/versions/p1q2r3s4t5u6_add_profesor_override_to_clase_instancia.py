"""Add profesor_id override to clase_instancia

Revision ID: p1q2r3s4t5u6v7w8x9y0
Revises: p1q2r3s4t5u6_add_licencias
Create Date: 2026-06-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'p1q2r3s4t5u6v7w8x9y0'
down_revision = 'p1q2r3s4t5u6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add profesor_id column to clase_instancias
    op.add_column('clase_instancias', sa.Column('profesor_id', sa.UUID(), nullable=True))
    
    # Add index on profesor_id
    op.create_index('ix_clase_instancias_profesor_id', 'clase_instancias', ['profesor_id'], unique=False)
    
    # Add foreign key constraint
    op.create_foreign_key(
        'clase_instancias_profesor_id_fkey',
        'clase_instancias',
        'profesores',
        ['profesor_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Drop foreign key and index
    op.drop_constraint('clase_instancias_profesor_id_fkey', 'clase_instancias', type_='foreignkey')
    op.drop_index('ix_clase_instancias_profesor_id', table_name='clase_instancias')
    
    # Drop column
    op.drop_column('clase_instancias', 'profesor_id')
