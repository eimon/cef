"""add tipo to asistencias

Revision ID: a1b2c3d4e5f6
Revises: d23feba6df02
Create Date: 2026-05-18 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'd23feba6df02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


tipoinscripcion_enum = sa.Enum('individual', 'suscripcion', name='tipoinscripcion')


def upgrade() -> None:
    tipoinscripcion_enum.create(op.get_bind(), checkfirst=True)
    op.add_column('asistencias', sa.Column('tipo', tipoinscripcion_enum, nullable=True))
    op.execute("UPDATE asistencias SET tipo = 'individual'")
    op.alter_column('asistencias', 'tipo', nullable=False)


def downgrade() -> None:
    op.drop_column('asistencias', 'tipo')
    tipoinscripcion_enum.drop(op.get_bind(), checkfirst=True)
