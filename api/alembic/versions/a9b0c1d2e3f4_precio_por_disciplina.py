"""precio por disciplina

Revision ID: a9b0c1d2e3f4
Revises: f2a3b4c5d6e7
Create Date: 2026-05-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM


revision: str = 'a9b0c1d2e3f4'
down_revision: Union[str, None] = 'f2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# El tipo "disciplina" ya existe en la DB (creado por la migración inicial de clase_templates)
disciplina_enum = ENUM('yoga', 'pilates', 'funcional', name='disciplina', create_type=False)


def upgrade() -> None:
    op.create_table(
        'precios_disciplinas',
        sa.Column('disciplina', disciplina_enum, primary_key=True),
        sa.Column('precio_individual', sa.Numeric(10, 2), nullable=False),
        sa.Column('precio_suscripcion', sa.Numeric(10, 2), nullable=False),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
    )

    # Migrar precios desde clase_templates (enum→enum, sin cast de string)
    op.execute(sa.text("""
        INSERT INTO precios_disciplinas (disciplina, precio_individual, precio_suscripcion)
        SELECT DISTINCT ON (disciplina)
            disciplina,
            precio_individual,
            precio_suscripcion
        FROM clase_templates
        WHERE activo = true
        ORDER BY disciplina, created_at ASC
        ON CONFLICT (disciplina) DO NOTHING
    """))

    # Los registros faltantes los crea el seeder al arrancar

    op.drop_column('clase_templates', 'precio_individual')
    op.drop_column('clase_templates', 'precio_suscripcion')
    op.drop_table('historial_precios')


def downgrade() -> None:
    op.create_table(
        'historial_precios',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('clase_template_id', UUID(as_uuid=True), sa.ForeignKey('clase_templates.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('tipo', sa.String(20), nullable=False),
        sa.Column('precio_anterior', sa.Numeric(10, 2), nullable=False),
        sa.Column('precio_nuevo', sa.Numeric(10, 2), nullable=False),
        sa.Column('fecha_cambio', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    op.add_column('clase_templates', sa.Column('precio_individual', sa.Numeric(10, 2), nullable=True))
    op.add_column('clase_templates', sa.Column('precio_suscripcion', sa.Numeric(10, 2), nullable=True))

    op.execute(sa.text("""
        UPDATE clase_templates ct
        SET precio_individual = pd.precio_individual,
            precio_suscripcion = pd.precio_suscripcion
        FROM precios_disciplinas pd
        WHERE ct.disciplina = pd.disciplina
    """))

    op.alter_column('clase_templates', 'precio_individual', nullable=False)
    op.alter_column('clase_templates', 'precio_suscripcion', nullable=False)

    op.drop_table('precios_disciplinas')
