import uuid
from datetime import date, time
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from models.asistencia import Asistencia
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.pagos import Pago
from models.suscripciones import Suscripcion
from core.enums import TipoInscripcion, EstadoPago


class InscripcionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_template(self, clase_template_id: uuid.UUID) -> ClaseTemplate | None:
        result = await self.db.execute(
            select(ClaseTemplate).where(
                ClaseTemplate.id == clase_template_id,
                ClaseTemplate.activo == True,
            )
        )
        return result.scalars().first()

    async def get_instancia(self, clase_template_id: uuid.UUID, fecha: date) -> ClaseInstancia | None:
        result = await self.db.execute(
            select(ClaseInstancia).where(
                ClaseInstancia.clase_template_id == clase_template_id,
                ClaseInstancia.fecha == fecha,
                ClaseInstancia.activo == True,
            )
        )
        return result.scalars().first()

    async def count_active_suscripciones(self, clase_template_id: uuid.UUID, fecha: date) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                Suscripcion.clase_template_id == clase_template_id,
                Suscripcion.fecha_inicio <= fecha,
                Suscripcion.fecha_fin >= fecha,
                Suscripcion.activo == True,
            )
        )
        return result.scalar() or 0

    async def get_or_create_instancia(
        self, clase_template_id: uuid.UUID, fecha: date, cupo_disponible: int
    ) -> ClaseInstancia:
        instancia = await self.get_instancia(clase_template_id, fecha)
        if instancia:
            return instancia
        instancia = ClaseInstancia(
            clase_template_id=clase_template_id,
            fecha=fecha,
            cupo=cupo_disponible,
        )
        self.db.add(instancia)
        await self.db.flush()
        await self.db.refresh(instancia)
        return instancia

    async def count_individual_asistencias(self, instancia_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                Asistencia.clase_instancia_id == instancia_id,
                Asistencia.tipo == TipoInscripcion.INDIVIDUAL,
                Asistencia.cancelo == False,
            )
        )
        return result.scalar() or 0

    async def has_existing_enrollment(self, usuario_id: uuid.UUID, instancia_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(Asistencia).where(
                Asistencia.usuario_id == usuario_id,
                Asistencia.clase_instancia_id == instancia_id,
                Asistencia.cancelo == False,
            )
        )
        return result.scalars().first() is not None

    async def has_schedule_conflict(
        self,
        usuario_id: uuid.UUID,
        fecha: date,
        hora_inicio: time,
        hora_fin: time,
        exclude_instancia_id: uuid.UUID | None = None,
    ) -> bool:
        query = (
            select(Asistencia)
            .join(ClaseInstancia, Asistencia.clase_instancia_id == ClaseInstancia.id)
            .join(ClaseTemplate, ClaseInstancia.clase_template_id == ClaseTemplate.id)
            .where(
                Asistencia.usuario_id == usuario_id,
                Asistencia.cancelo == False,
                ClaseInstancia.fecha == fecha,
                ClaseTemplate.hora_inicio < hora_fin,
                ClaseTemplate.hora_fin > hora_inicio,
            )
        )
        if exclude_instancia_id:
            query = query.where(Asistencia.clase_instancia_id != exclude_instancia_id)
        result = await self.db.execute(query)
        return result.scalars().first() is not None

    async def has_active_suscripcion(
        self, usuario_id: uuid.UUID, clase_template_id: uuid.UUID, fecha: date
    ) -> bool:
        result = await self.db.execute(
            select(Suscripcion).where(
                Suscripcion.usuario_id == usuario_id,
                Suscripcion.clase_template_id == clase_template_id,
                Suscripcion.fecha_inicio <= fecha,
                Suscripcion.fecha_fin >= fecha,
                Suscripcion.activo == True,
            )
        )
        return result.scalars().first() is not None

    async def create_inscripcion_individual(
        self,
        usuario_id: uuid.UUID,
        instancia: ClaseInstancia,
        monto: Decimal,
        mp_payment_id: str = "mock",
    ) -> tuple[Asistencia, Pago]:
        from datetime import datetime, timezone

        instancia.cupo -= 1

        asistencia = Asistencia(
            usuario_id=usuario_id,
            clase_instancia_id=instancia.id,
            tipo=TipoInscripcion.INDIVIDUAL,
            asistio=False,
            cancelo=False,
        )
        self.db.add(asistencia)
        await self.db.flush()
        await self.db.refresh(asistencia)

        pago = Pago(
            usuario_id=usuario_id,
            clase_instancia_id=instancia.id,
            monto=monto,
            fecha_pago=datetime.now(timezone.utc),
            estado=EstadoPago.PAGADO,
            mp_payment_id=mp_payment_id,
            descripcion="Pago individual" if mp_payment_id != "mock" else "Pago individual mock",
            activo=True,
        )
        self.db.add(pago)
        await self.db.flush()
        await self.db.refresh(pago)

        return asistencia, pago
