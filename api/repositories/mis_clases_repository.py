import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from models.asistencia import Asistencia
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.pagos import Pago
from models.disciplina import Disciplina as DisciplinaModel
from models.suscripciones import Suscripcion
from core.enums import TipoInscripcion


class MisClasesRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_individuales(self, usuario_id: uuid.UUID) -> list:
        from models.profesor import Profesor
        from models.sala import Sala

        monto_pagado_sq = (
            select(func.coalesce(func.sum(Pago.monto), 0))
            .where(
                Pago.usuario_id == usuario_id,
                Pago.clase_instancia_id == Asistencia.clase_instancia_id,
                Pago.activo == True,
            )
            .correlate(Asistencia)
            .scalar_subquery()
        )

        estado_pago_sq = (
            select(Pago.estado)
            .where(
                Pago.usuario_id == usuario_id,
                Pago.clase_instancia_id == Asistencia.clase_instancia_id,
                Pago.activo == True,
            )
            .correlate(Asistencia)
            .order_by(Pago.created_at.desc())
            .limit(1)
            .scalar_subquery()
        )

        stmt = (
            select(
                Asistencia.id.label("asistencia_id"),
                Asistencia.asistio,
                Asistencia.cancelo,
                ClaseTemplate.nombre.label("clase_nombre"),
                ClaseTemplate.disciplina,
                ClaseTemplate.hora_inicio,
                ClaseTemplate.hora_fin,
                ClaseInstancia.fecha,
                (Profesor.nombre + " " + Profesor.apellido).label("profesor_nombre"),
                Sala.nombre.label("sala_nombre"),
                monto_pagado_sq.label("monto_pagado"),
                estado_pago_sq.label("estado_pago"),
                DisciplinaModel.precio_individual.label("precio_clase"),
            )
            .join(ClaseInstancia, Asistencia.clase_instancia_id == ClaseInstancia.id)
            .join(ClaseTemplate, ClaseInstancia.clase_template_id == ClaseTemplate.id)
            .outerjoin(Profesor, ClaseTemplate.profesor_id == Profesor.id)
            .outerjoin(Sala, ClaseTemplate.sala_id == Sala.id)
            .outerjoin(DisciplinaModel, DisciplinaModel.nombre == ClaseTemplate.disciplina)
            .where(
                Asistencia.usuario_id == usuario_id,
                Asistencia.tipo == TipoInscripcion.INDIVIDUAL,
            )
            .order_by(ClaseInstancia.fecha.desc())
        )
        result = await self.db.execute(stmt)
        return result.all()

    async def get_suscripciones(self, usuario_id: uuid.UUID) -> list[Suscripcion]:
        result = await self.db.execute(
            select(Suscripcion)
            .options(
                selectinload(Suscripcion.clase_template)
                .selectinload(ClaseTemplate.profesor),
                selectinload(Suscripcion.clase_template)
                .selectinload(ClaseTemplate.sala),
            )
            .where(Suscripcion.usuario_id == usuario_id)
            .order_by(Suscripcion.fecha_inicio.desc())
        )
        return list(result.scalars().all())

    async def get_instancias_de_suscripcion(
        self, clase_template_id: uuid.UUID, fecha_inicio, fecha_fin
    ) -> list[ClaseInstancia]:
        result = await self.db.execute(
            select(ClaseInstancia)
            .where(
                ClaseInstancia.clase_template_id == clase_template_id,
                ClaseInstancia.fecha >= fecha_inicio,
                ClaseInstancia.fecha <= fecha_fin,
                ClaseInstancia.activo == True,
            )
            .order_by(ClaseInstancia.fecha.asc())
        )
        return list(result.scalars().all())
