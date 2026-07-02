"""add waitlist_suscripcion_entries table

Revision ID: v1w2x3y4z5a6
Revises: u1v2w3x4y5z6
Create Date: 2026-07-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "v1w2x3y4z5a6"
down_revision: Union[str, None] = "u1v2w3x4y5z6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "waitlist_suscripcion_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "usuario_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "clase_template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clase_templates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("posicion", sa.Integer(), nullable=False),
        sa.Column(
            "estado",
            postgresql.ENUM(
                "en_espera",
                "notificado",
                "confirmado_pagado",
                "expirado",
                "cancelado",
                name="estadowaitlist",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("notificado_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expira_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("posicion > 0", name="ck_waitlist_suscripcion_posicion_positive"),
    )

    op.create_index("ix_waitlist_suscripcion_entries_id", "waitlist_suscripcion_entries", ["id"])
    op.create_index("ix_waitlist_suscripcion_entries_usuario_id", "waitlist_suscripcion_entries", ["usuario_id"])
    op.create_index(
        "ix_waitlist_suscripcion_entries_clase_template_id",
        "waitlist_suscripcion_entries",
        ["clase_template_id"],
    )
    op.create_index("ix_waitlist_suscripcion_entries_fecha", "waitlist_suscripcion_entries", ["fecha"])

    op.create_index(
        "ix_waitlist_suscripcion_fifo_slot",
        "waitlist_suscripcion_entries",
        ["clase_template_id", "fecha", "posicion"],
        unique=False,
        postgresql_where=sa.text("activo = true AND estado IN ('en_espera', 'notificado')"),
    )
    op.create_index(
        "uq_waitlist_suscripcion_active_user_slot",
        "waitlist_suscripcion_entries",
        ["usuario_id", "clase_template_id", "fecha"],
        unique=True,
        postgresql_where=sa.text("activo = true AND estado IN ('en_espera', 'notificado')"),
    )


def downgrade() -> None:
    op.drop_index("uq_waitlist_suscripcion_active_user_slot", table_name="waitlist_suscripcion_entries")
    op.drop_index("ix_waitlist_suscripcion_fifo_slot", table_name="waitlist_suscripcion_entries")
    op.drop_index("ix_waitlist_suscripcion_entries_fecha", table_name="waitlist_suscripcion_entries")
    op.drop_index("ix_waitlist_suscripcion_entries_clase_template_id", table_name="waitlist_suscripcion_entries")
    op.drop_index("ix_waitlist_suscripcion_entries_usuario_id", table_name="waitlist_suscripcion_entries")
    op.drop_index("ix_waitlist_suscripcion_entries_id", table_name="waitlist_suscripcion_entries")
    op.drop_table("waitlist_suscripcion_entries")
