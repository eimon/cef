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
from models.suscripciones import Suscripcion, SuscripcionReserva
from core.enums import TipoInscripcion, CanceladoPor


class MisClasesRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_individuales(self, usuario_id: uuid.UUID) -> list:
        from models.profesor import Profesor
        from models.sala import Sala
        from sqlalchemy import case

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

        # Use instance profesor_id if overridden (license replacement), otherwise template profesor_id
        profesor_id_expr = func.coalesce(ClaseInstancia.profesor_id, ClaseTemplate.profesor_id)

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
            .outerjoin(Profesor, profesor_id_expr == Profesor.id)
            .outerjoin(Sala, ClaseTemplate.sala_id == Sala.id)
            .outerjoin(DisciplinaModel, DisciplinaModel.nombre == ClaseTemplate.disciplina)
            .where(
                Asistencia.usuario_id == usuario_id,
                Asistencia.tipo == TipoInscripcion.INDIVIDUAL,
                Asistencia.cancelo == False,
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

    async def get_asistencia_ids_for_instancias(
        self, usuario_id: uuid.UUID, instancia_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, uuid.UUID]:
        if not instancia_ids:
            return {}
        result = await self.db.execute(
            select(Asistencia.clase_instancia_id, Asistencia.id)
            .where(
                Asistencia.usuario_id == usuario_id,
                Asistencia.clase_instancia_id.in_(instancia_ids),
                Asistencia.tipo == TipoInscripcion.SUSCRIPCION,
                Asistencia.cancelo == False,
            )
        )
        return {row[0]: row[1] for row in result.all()}

    async def get_instancias_de_suscripcion(
        self, suscripcion_id: uuid.UUID, clase_template_id: uuid.UUID, fecha_inicio, fecha_fin
    ) -> list[ClaseInstancia]:
        result = await self.db.execute(
            select(ClaseInstancia)
            .join(SuscripcionReserva, SuscripcionReserva.clase_instancia_id == ClaseInstancia.id)
            .where(
                SuscripcionReserva.suscripcion_id == suscripcion_id,
                SuscripcionReserva.activa == True,
                ClaseInstancia.clase_template_id == clase_template_id,
                ClaseInstancia.fecha >= fecha_inicio,
                ClaseInstancia.fecha <= fecha_fin,
                ClaseInstancia.activo == True,
            )
            .order_by(ClaseInstancia.fecha.asc())
        )
        instancias = list(result.scalars().all())
        if instancias:
            return instancias

        reserva_count = (await self.db.execute(
            select(func.count()).where(SuscripcionReserva.suscripcion_id == suscripcion_id)
        )).scalar() or 0
        if reserva_count > 0:
            return []

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

    async def get_cancelaciones(self, usuario_id: uuid.UUID) -> list:
        from models.profesor import Profesor
        from models.sala import Sala

        stmt = (
            select(
                Asistencia.id.label("asistencia_id"),
                Asistencia.tipo,
                Asistencia.cancelado_por,
                Asistencia.updated_at.label("cancelado_at"),
                ClaseTemplate.nombre.label("clase_nombre"),
                ClaseTemplate.disciplina,
                ClaseTemplate.hora_inicio,
                ClaseTemplate.hora_fin,
                ClaseInstancia.fecha,
                (Profesor.nombre + " " + Profesor.apellido).label("profesor_nombre"),
                Sala.nombre.label("sala_nombre"),
            )
            .join(ClaseInstancia, Asistencia.clase_instancia_id == ClaseInstancia.id)
            .join(ClaseTemplate, ClaseInstancia.clase_template_id == ClaseTemplate.id)
            .outerjoin(
                Profesor,
                func.coalesce(ClaseInstancia.profesor_id, ClaseTemplate.profesor_id) == Profesor.id,
            )
            .outerjoin(Sala, ClaseTemplate.sala_id == Sala.id)
            .where(
                Asistencia.usuario_id == usuario_id,
                Asistencia.cancelo == True,
            )
            .order_by(ClaseInstancia.fecha.desc())
        )
        result = await self.db.execute(stmt)
        return result.all()
