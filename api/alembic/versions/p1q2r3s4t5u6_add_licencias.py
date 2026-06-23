"""add licencias table

Revision ID: p1q2r3s4t5u6
Revises: o1p2q3r4s5t6
Create Date: 2026-06-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "p1q2r3s4t5u6"
down_revision: Union[str, None] = "o1p2q3r4s5t6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    try:
        connection.execute(
            sa.text(
                "CREATE TYPE tipolicencia AS ENUM ('vacaciones', 'enfermedad', 'personal', 'estudio', 'otro')"
            )
        )
    except Exception:
        pass

    try:
        connection.execute(
            sa.text(
                "CREATE TYPE estadolicencia AS ENUM ('pendiente', 'aprobada', 'rechazada')"
            )
        )
    except Exception:
        pass

    op.create_table(
        "licencias",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "profesor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("profesores.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "profesor_reemplazo_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("profesores.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("fecha_inicio", sa.Date(), nullable=False),
        sa.Column("fecha_fin", sa.Date(), nullable=False),
        sa.Column(
            "tipo",
            postgresql.ENUM(
                "vacaciones",
                "enfermedad",
                "personal",
                "estudio",
                "otro",
                name="tipolicencia",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "estado",
            postgresql.ENUM(
                "pendiente",
                "aprobada",
                "rechazada",
                name="estadolicencia",
                create_type=False,
            ),
            nullable=False,
            server_default="pendiente",
        ),
        sa.Column("motivo", sa.String(length=500), nullable=True),
        sa.Column("notas_admin", sa.String(length=500), nullable=True),
        sa.Column(
            "resuelto_por_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("resuelto_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("fecha_inicio <= fecha_fin", name="ck_licencias_fechas"),
    )

    op.create_index("ix_licencias_id", "licencias", ["id"])
    op.create_index("ix_licencias_profesor_id", "licencias", ["profesor_id"])
    op.create_index("ix_licencias_profesor_reemplazo_id", "licencias", ["profesor_reemplazo_id"])
    op.create_index("ix_licencias_fecha_inicio", "licencias", ["fecha_inicio"])
    op.create_index("ix_licencias_fecha_fin", "licencias", ["fecha_fin"])
    op.create_index("ix_licencias_estado", "licencias", ["estado"])
    op.create_index(
        "ix_licencias_profesor_rango",
        "licencias",
        ["profesor_id", "fecha_inicio", "fecha_fin"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_licencias_profesor_rango", table_name="licencias")
    op.drop_index("ix_licencias_estado", table_name="licencias")
    op.drop_index("ix_licencias_fecha_fin", table_name="licencias")
    op.drop_index("ix_licencias_fecha_inicio", table_name="licencias")
    op.drop_index("ix_licencias_profesor_reemplazo_id", table_name="licencias")
    op.drop_index("ix_licencias_profesor_id", table_name="licencias")
    op.drop_index("ix_licencias_id", table_name="licencias")
    op.drop_table("licencias")
    op.execute("DROP TYPE IF EXISTS estadolicencia")
    op.execute("DROP TYPE IF EXISTS tipolicencia")
