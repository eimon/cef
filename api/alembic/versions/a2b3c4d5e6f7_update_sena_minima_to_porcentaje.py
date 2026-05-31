"""update sena_minima to porcentaje

Revision ID: a2b3c4d5e6f7
Revises: f2a3b4c5d6e7
Create Date: 2026-05-31

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = 'f2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "UPDATE configuraciones SET valor = '50' WHERE clave = 'sena_minima'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE configuraciones SET valor = '0' WHERE clave = 'sena_minima'"
    )
