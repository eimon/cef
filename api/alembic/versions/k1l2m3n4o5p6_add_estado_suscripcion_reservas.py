"""add estado suscripcion reservas

Revision ID: k1l2m3n4o5p6
Revises: j2c3d4e5f6a7
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "k1l2m3n4o5p6"
down_revision: Union[str, Sequence[str], None] = "j2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    estado_suscripcion = postgresql.ENUM(
        "vigente",
        "renovable",
        "vencida",
        name="estadosuscripcion",
        create_type=False,
    )
    estado_suscripcion.create(op.get_bind(), checkfirst=True)

    op.add_column("suscripciones", sa.Column("fecha_pago", sa.Date(), nullable=True))
    op.add_column("suscripciones", sa.Column("estado", estado_suscripcion, nullable=True))
    op.execute(
        """
        UPDATE suscripciones
        SET fecha_pago = COALESCE(created_at::date, fecha_inicio),
            estado = 'vigente'
        """
    )
    op.alter_column("suscripciones", "fecha_pago", nullable=False)
    op.alter_column("suscripciones", "estado", nullable=False)

    op.create_table(
        "suscripcion_reservas",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("suscripcion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("clase_instancia_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("activa", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["clase_instancia_id"], ["clase_instancias.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["suscripcion_id"], ["suscripciones.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_suscripcion_reservas_id"), "suscripcion_reservas", ["id"], unique=False)
    op.create_index(
        op.f("ix_suscripcion_reservas_suscripcion_id"),
        "suscripcion_reservas",
        ["suscripcion_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_suscripcion_reservas_clase_instancia_id"),
        "suscripcion_reservas",
        ["clase_instancia_id"],
        unique=False,
    )
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute(
        """
        INSERT INTO suscripcion_reservas (id, suscripcion_id, clase_instancia_id, activa, created_at)
        SELECT gen_random_uuid(), s.id, ci.id, true, now()
        FROM suscripciones s
        JOIN clase_instancias ci
          ON ci.clase_template_id = s.clase_template_id
         AND ci.fecha >= s.fecha_inicio
         AND ci.fecha <= s.fecha_fin
         AND ci.activo = true
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_suscripcion_reservas_clase_instancia_id"), table_name="suscripcion_reservas")
    op.drop_index(op.f("ix_suscripcion_reservas_suscripcion_id"), table_name="suscripcion_reservas")
    op.drop_index(op.f("ix_suscripcion_reservas_id"), table_name="suscripcion_reservas")
    op.drop_table("suscripcion_reservas")
    op.drop_column("suscripciones", "estado")
    op.drop_column("suscripciones", "fecha_pago")
    postgresql.ENUM(name="estadosuscripcion").drop(op.get_bind(), checkfirst=True)
