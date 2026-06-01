"""merge unaccent and payment heads

Revision ID: d4e5f6a7b8c9
Revises: b1c2d3e4f5a6, c9d8e7f6a5b4
Create Date: 2026-06-01 11:18:00.000000
"""

from typing import Sequence, Union


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = ("b1c2d3e4f5a6", "c9d8e7f6a5b4")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
