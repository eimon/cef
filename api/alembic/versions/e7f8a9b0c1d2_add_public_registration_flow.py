"""add public registration flow

Revision ID: e7f8a9b0c1d2
Revises: 446ff3dfa3c2
Create Date: 2026-05-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e7f8a9b0c1d2'
down_revision: Union[str, None] = '446ff3dfa3c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('usuarios', sa.Column('genero', sa.String(length=50), nullable=True))
    op.add_column('usuarios', sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('usuarios', sa.Column('registration_completed_at', sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        'registration_tokens',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('usuario_id', sa.UUID(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_registration_tokens_token_hash'), 'registration_tokens', ['token_hash'], unique=True)
    op.create_index(op.f('ix_registration_tokens_usuario_id'), 'registration_tokens', ['usuario_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_registration_tokens_usuario_id'), table_name='registration_tokens')
    op.drop_index(op.f('ix_registration_tokens_token_hash'), table_name='registration_tokens')
    op.drop_table('registration_tokens')

    op.drop_column('usuarios', 'registration_completed_at')
    op.drop_column('usuarios', 'email_verified_at')
    op.drop_column('usuarios', 'genero')
