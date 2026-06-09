"""precios en disciplinas

Revision ID: i1b2c3d4e5f6
Revises: h1a2b3c4d5e6
Create Date: 2026-06-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'i1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'h1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('disciplinas', sa.Column('precio_individual', sa.Numeric(10, 2), nullable=True))
    op.add_column('disciplinas', sa.Column('precio_suscripcion', sa.Numeric(10, 2), nullable=True))

    op.execute("""
        UPDATE disciplinas d
        SET precio_individual = pd.precio_individual,
            precio_suscripcion = pd.precio_suscripcion
        FROM precios_disciplinas pd
        WHERE LOWER(d.nombre) = LOWER(pd.disciplina)
    """)

    op.execute("UPDATE disciplinas SET precio_individual = 0 WHERE precio_individual IS NULL")
    op.execute("UPDATE disciplinas SET precio_suscripcion = 0 WHERE precio_suscripcion IS NULL")

    op.alter_column('disciplinas', 'precio_individual', nullable=False)
    op.alter_column('disciplinas', 'precio_suscripcion', nullable=False)

    op.drop_table('precios_disciplinas')


def downgrade() -> None:
    op.create_table(
        'precios_disciplinas',
        sa.Column('disciplina', sa.String(100), primary_key=True),
        sa.Column('precio_individual', sa.Numeric(10, 2), nullable=False),
        sa.Column('precio_suscripcion', sa.Numeric(10, 2), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.execute("""
        INSERT INTO precios_disciplinas (disciplina, precio_individual, precio_suscripcion)
        SELECT nombre, precio_individual, precio_suscripcion FROM disciplinas
    """)

    op.drop_column('disciplinas', 'precio_individual')
    op.drop_column('disciplinas', 'precio_suscripcion')
