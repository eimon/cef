"""enable unaccent extension

Revision ID: c9d8e7f6a5b4
Revises: b0c1d2e3f4a5
Create Date: 2026-05-31 00:00:00.000000
"""

from typing import Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c9d8e7f6a5b4"
down_revision: Union[str, None] = "b0c1d2e3f4a5"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS unaccent")
