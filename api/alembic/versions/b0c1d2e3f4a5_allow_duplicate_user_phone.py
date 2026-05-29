"""allow duplicate user phone

Revision ID: b0c1d2e3f4a5
Revises: a9b0c1d2e3f4
Create Date: 2026-05-29

"""
from typing import Sequence, Union

from alembic import op


revision: str = "b0c1d2e3f4a5"
down_revision: Union[str, None] = "a9b0c1d2e3f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(op.f("ix_usuarios_telefono"), table_name="usuarios")
    op.create_index(op.f("ix_usuarios_telefono"), "usuarios", ["telefono"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_usuarios_telefono"), table_name="usuarios")
    op.create_index(op.f("ix_usuarios_telefono"), "usuarios", ["telefono"], unique=True)
