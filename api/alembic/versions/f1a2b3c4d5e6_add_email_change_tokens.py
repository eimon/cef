"""add email change tokens

Revision ID: f1a2b3c4d5e6
Revises: e7f8a9b0c1d2
Create Date: 2026-05-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e7f8a9b0c1d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'email_change_tokens',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('usuario_id', sa.UUID(), nullable=False),
        sa.Column('new_email', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_email_change_tokens_token_hash'), 'email_change_tokens', ['token_hash'], unique=True)
    op.create_index(op.f('ix_email_change_tokens_usuario_id'), 'email_change_tokens', ['usuario_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_email_change_tokens_usuario_id'), table_name='email_change_tokens')
    op.drop_index(op.f('ix_email_change_tokens_token_hash'), table_name='email_change_tokens')
    op.drop_table('email_change_tokens')
