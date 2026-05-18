"""add disciplina to clase_template

Revision ID: d23feba6df02
Revises: 295b4ffaa933
Create Date: 2026-05-18 21:24:55.996305

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd23feba6df02'
down_revision: Union[str, None] = '295b4ffaa933'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


disciplina_enum = sa.Enum('YOGA', 'PILATES', 'FUNCIONAL', name='disciplina')


def upgrade() -> None:
    disciplina_enum.create(op.get_bind(), checkfirst=True)
    op.add_column('clase_templates', sa.Column('disciplina', disciplina_enum, nullable=True))
    # Poblar filas existentes antes de aplicar NOT NULL
    op.execute("UPDATE clase_templates SET disciplina = 'YOGA' WHERE nombre = 'Yoga'")
    op.execute("UPDATE clase_templates SET disciplina = 'PILATES' WHERE nombre = 'Pilates'")
    op.execute("UPDATE clase_templates SET disciplina = 'FUNCIONAL' WHERE nombre = 'Funcional'")
    op.alter_column('clase_templates', 'disciplina', nullable=False)
    op.drop_constraint(op.f('fichas_medicas_usuario_id_key'), 'fichas_medicas', type_='unique')
    op.drop_index(op.f('ix_fichas_medicas_usuario_id'), table_name='fichas_medicas')
    op.create_index(op.f('ix_fichas_medicas_usuario_id'), 'fichas_medicas', ['usuario_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_fichas_medicas_usuario_id'), table_name='fichas_medicas')
    op.create_index(op.f('ix_fichas_medicas_usuario_id'), 'fichas_medicas', ['usuario_id'], unique=False)
    op.create_unique_constraint(op.f('fichas_medicas_usuario_id_key'), 'fichas_medicas', ['usuario_id'], postgresql_nulls_not_distinct=False)
    op.drop_column('clase_templates', 'disciplina')
    disciplina_enum.drop(op.get_bind(), checkfirst=True)
