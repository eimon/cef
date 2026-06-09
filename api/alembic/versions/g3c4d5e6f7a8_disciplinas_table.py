"""disciplinas table

Revision ID: g3c4d5e6f7a8
Revises: g2b3c4d5e6f7
Create Date: 2026-06-08

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
import uuid

revision = 'g3c4d5e6f7a8'
down_revision = 'g2b3c4d5e6f7'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create disciplinas table
    op.create_table(
        'disciplinas',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('nombre', name='uq_disciplinas_nombre'),
    )

    # 2. Insert the 3 existing disciplinas
    op.execute("""
        INSERT INTO disciplinas (id, nombre, activo)
        VALUES
            (gen_random_uuid(), 'yoga', true),
            (gen_random_uuid(), 'pilates', true),
            (gen_random_uuid(), 'funcional', true)
    """)

    # 3. Change clase_templates.disciplina from ENUM to VARCHAR(100)
    op.execute(
        "ALTER TABLE clase_templates ALTER COLUMN disciplina TYPE VARCHAR(100) USING disciplina::text"
    )

    # 4. Change precio_disciplinas.disciplina from ENUM to VARCHAR(100)
    op.execute(
        "ALTER TABLE precios_disciplinas ALTER COLUMN disciplina TYPE VARCHAR(100) USING disciplina::text"
    )

    # 5. Drop the PostgreSQL enum type
    op.execute("DROP TYPE IF EXISTS disciplina")


def downgrade():
    # Recreate the enum type
    op.execute("CREATE TYPE disciplina AS ENUM ('yoga', 'pilates', 'funcional')")

    # Convert VARCHAR back to enum in clase_templates
    op.execute(
        "ALTER TABLE clase_templates ALTER COLUMN disciplina TYPE disciplina USING disciplina::disciplina"
    )

    # Convert VARCHAR back to enum in precios_disciplinas
    op.execute(
        "ALTER TABLE precios_disciplinas ALTER COLUMN disciplina TYPE disciplina USING disciplina::disciplina"
    )

    # Drop the disciplinas table
    op.drop_table('disciplinas')
