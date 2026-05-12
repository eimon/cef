"""initial

Revision ID: 295b4ffaa933
Revises:
Create Date: 2026-05-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '295b4ffaa933'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Tablas sin dependencias ---
    op.create_table('usuarios',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('telefono', sa.String(), nullable=True),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=True),
        sa.Column('apellido', sa.String(length=100), nullable=True),
        sa.Column('fecha_nacimiento', sa.Date(), nullable=True),
        sa.Column('dni', sa.String(length=20), nullable=True),
        sa.Column('role', sa.Enum('ADMIN', 'RECEPCION', 'CLIENTE', name='userrole'), nullable=False),
        sa.Column('activo', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_usuarios_id'), 'usuarios', ['id'], unique=False)
    op.create_index(op.f('ix_usuarios_email'), 'usuarios', ['email'], unique=True)
    op.create_index(op.f('ix_usuarios_telefono'), 'usuarios', ['telefono'], unique=True)
    op.create_index(op.f('ix_usuarios_dni'), 'usuarios', ['dni'], unique=True)

    op.create_table('profesores',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('dni', sa.String(length=20), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('apellido', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('telefono', sa.String(length=50), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_profesores_id'), 'profesores', ['id'], unique=False)
    op.create_index(op.f('ix_profesores_dni'), 'profesores', ['dni'], unique=True)
    op.create_index(op.f('ix_profesores_email'), 'profesores', ['email'], unique=True)

    op.create_table('salas',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('nombre', sa.String(length=200), nullable=False),
        sa.Column('sede', sa.String(length=200), nullable=True),
        sa.Column('capacidad', sa.Integer(), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_salas_id'), 'salas', ['id'], unique=False)

    # --- FK a usuarios ---
    op.create_table('refresh_tokens',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('usuario_id', sa.UUID(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('replaced_by', sa.UUID(), nullable=True),
        sa.Column('device_hint', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['replaced_by'], ['refresh_tokens.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_refresh_tokens_token_hash'), 'refresh_tokens', ['token_hash'], unique=True)
    op.create_index(op.f('ix_refresh_tokens_usuario_id'), 'refresh_tokens', ['usuario_id'], unique=False)

    op.create_table('suscripciones',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('usuario_id', sa.UUID(), nullable=False),
        sa.Column('monto', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('fecha_inicio', sa.Date(), nullable=False),
        sa.Column('fecha_fin', sa.Date(), nullable=False),
        sa.Column('activo', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_suscripciones_id'), 'suscripciones', ['id'], unique=False)
    op.create_index(op.f('ix_suscripciones_usuario_id'), 'suscripciones', ['usuario_id'], unique=False)

    op.create_table('fichas_medicas',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('usuario_id', sa.UUID(), nullable=False),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('cuerpo_ficha', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('usuario_id'),
    )
    op.create_index(op.f('ix_fichas_medicas_id'), 'fichas_medicas', ['id'], unique=False)
    op.create_index(op.f('ix_fichas_medicas_usuario_id'), 'fichas_medicas', ['usuario_id'], unique=False)

    # --- FK a profesores + salas ---
    op.create_table('clase_templates',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('nombre', sa.String(length=200), nullable=False),
        sa.Column('descripcion', sa.String(length=500), nullable=True),
        sa.Column('profesor_id', sa.UUID(), nullable=True),
        sa.Column('sala_id', sa.UUID(), nullable=True),
        sa.Column('dia_semana', sa.Enum('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO', name='diasemana'), nullable=False),
        sa.Column('hora_inicio', sa.Time(), nullable=False),
        sa.Column('hora_fin', sa.Time(), nullable=False),
        sa.Column('capacidad_maxima', sa.Integer(), nullable=False),
        sa.Column('precio_individual', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('precio_suscripcion', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('activo', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['profesor_id'], ['profesores.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['sala_id'], ['salas.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_clase_templates_id'), 'clase_templates', ['id'], unique=False)
    op.create_index(op.f('ix_clase_templates_profesor_id'), 'clase_templates', ['profesor_id'], unique=False)
    op.create_index(op.f('ix_clase_templates_sala_id'), 'clase_templates', ['sala_id'], unique=False)

    # --- FK a clase_templates ---
    op.create_table('clase_instancias',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('clase_template_id', sa.UUID(), nullable=False),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('cupo', sa.Integer(), nullable=False),
        sa.Column('cupo_oculto', sa.Integer(), nullable=False),
        sa.Column('cancelada', sa.Boolean(), nullable=True),
        sa.Column('motivo_cancelacion', sa.String(length=500), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['clase_template_id'], ['clase_templates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_clase_instancias_id'), 'clase_instancias', ['id'], unique=False)
    op.create_index(op.f('ix_clase_instancias_clase_template_id'), 'clase_instancias', ['clase_template_id'], unique=False)

    # --- FK a usuarios + clase_instancias ---
    op.create_table('asistencias',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('usuario_id', sa.UUID(), nullable=False),
        sa.Column('clase_instancia_id', sa.UUID(), nullable=False),
        sa.Column('asistio', sa.Boolean(), nullable=True),
        sa.Column('cancelo', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['clase_instancia_id'], ['clase_instancias.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_asistencias_id'), 'asistencias', ['id'], unique=False)
    op.create_index(op.f('ix_asistencias_usuario_id'), 'asistencias', ['usuario_id'], unique=False)
    op.create_index(op.f('ix_asistencias_clase_instancia_id'), 'asistencias', ['clase_instancia_id'], unique=False)

    op.create_table('pagos',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('usuario_id', sa.UUID(), nullable=False),
        sa.Column('suscripcion_id', sa.UUID(), nullable=True),
        sa.Column('clase_instancia_id', sa.UUID(), nullable=True),
        sa.Column('monto', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('fecha_pago', sa.DateTime(timezone=True), nullable=False),
        sa.Column('estado', sa.Enum('PENDIENTE', 'PAGADO', 'ANULADO', name='estadopago'), nullable=False),
        sa.Column('mp_payment_id', sa.String(length=100), nullable=True),
        sa.Column('descripcion', sa.String(length=500), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['clase_instancia_id'], ['clase_instancias.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['suscripcion_id'], ['suscripciones.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_pagos_id'), 'pagos', ['id'], unique=False)
    op.create_index(op.f('ix_pagos_usuario_id'), 'pagos', ['usuario_id'], unique=False)
    op.create_index(op.f('ix_pagos_suscripcion_id'), 'pagos', ['suscripcion_id'], unique=False)
    op.create_index(op.f('ix_pagos_clase_instancia_id'), 'pagos', ['clase_instancia_id'], unique=False)
    op.create_index(op.f('ix_pagos_mp_payment_id'), 'pagos', ['mp_payment_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_pagos_mp_payment_id'), table_name='pagos')
    op.drop_index(op.f('ix_pagos_clase_instancia_id'), table_name='pagos')
    op.drop_index(op.f('ix_pagos_suscripcion_id'), table_name='pagos')
    op.drop_index(op.f('ix_pagos_usuario_id'), table_name='pagos')
    op.drop_index(op.f('ix_pagos_id'), table_name='pagos')
    op.drop_table('pagos')

    op.drop_index(op.f('ix_asistencias_clase_instancia_id'), table_name='asistencias')
    op.drop_index(op.f('ix_asistencias_usuario_id'), table_name='asistencias')
    op.drop_index(op.f('ix_asistencias_id'), table_name='asistencias')
    op.drop_table('asistencias')

    op.drop_index(op.f('ix_clase_instancias_clase_template_id'), table_name='clase_instancias')
    op.drop_index(op.f('ix_clase_instancias_id'), table_name='clase_instancias')
    op.drop_table('clase_instancias')

    op.drop_index(op.f('ix_clase_templates_sala_id'), table_name='clase_templates')
    op.drop_index(op.f('ix_clase_templates_profesor_id'), table_name='clase_templates')
    op.drop_index(op.f('ix_clase_templates_id'), table_name='clase_templates')
    op.drop_table('clase_templates')

    op.drop_index(op.f('ix_fichas_medicas_usuario_id'), table_name='fichas_medicas')
    op.drop_index(op.f('ix_fichas_medicas_id'), table_name='fichas_medicas')
    op.drop_table('fichas_medicas')

    op.drop_index(op.f('ix_suscripciones_usuario_id'), table_name='suscripciones')
    op.drop_index(op.f('ix_suscripciones_id'), table_name='suscripciones')
    op.drop_table('suscripciones')

    op.drop_index(op.f('ix_refresh_tokens_usuario_id'), table_name='refresh_tokens')
    op.drop_index(op.f('ix_refresh_tokens_token_hash'), table_name='refresh_tokens')
    op.drop_table('refresh_tokens')

    op.drop_index(op.f('ix_salas_id'), table_name='salas')
    op.drop_table('salas')

    op.drop_index(op.f('ix_profesores_email'), table_name='profesores')
    op.drop_index(op.f('ix_profesores_dni'), table_name='profesores')
    op.drop_index(op.f('ix_profesores_id'), table_name='profesores')
    op.drop_table('profesores')

    op.drop_index(op.f('ix_usuarios_dni'), table_name='usuarios')
    op.drop_index(op.f('ix_usuarios_telefono'), table_name='usuarios')
    op.drop_index(op.f('ix_usuarios_email'), table_name='usuarios')
    op.drop_index(op.f('ix_usuarios_id'), table_name='usuarios')
    op.drop_table('usuarios')

    sa.Enum(name='diasemana').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='estadopago').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='userrole').drop(op.get_bind(), checkfirst=True)
