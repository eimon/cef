"""merge heads

Revision ID: b1c2d3e4f5a6
Revises: a2b3c4d5e6f7, b0c1d2e3f4a5
Create Date: 2026-05-31

"""
from typing import Sequence, Union

revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = ('a2b3c4d5e6f7', 'b0c1d2e3f4a5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
