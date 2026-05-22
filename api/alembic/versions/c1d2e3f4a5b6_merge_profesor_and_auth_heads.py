"""merge profesor and auth heads

Revision ID: c1d2e3f4a5b6
Revises: 0bc6b3d6909d, a1b2c3d4e5f7
Create Date: 2026-05-21

"""
from typing import Sequence, Union

revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = ('0bc6b3d6909d', 'a1b2c3d4e5f7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
