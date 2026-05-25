import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from core.enums import DiaSemana, TipoInscripcion, EstadoPago
from models.asistencia import Asistencia
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.pagos import Pago
from models.suscripciones import Suscripcion


class SuscripcionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_template(self, template_id: uuid.UUID) -> ClaseTemplate | None:
        result = await self.db.execute(
            select(ClaseTemplate).where(
                ClaseTemplate.id == template_id,
                ClaseTemplate.activo == True,
            )
        )
        return result.scalars().first()

    async def has_active_suscripciones(self, usuario_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(Suscripcion).where(
                Suscripcion.usuario_id == usuario_id,
                Suscripcion.activo == True,
            )
        )
        return result.scalars().first() is not None

    async def has_suscripcion_activa(
        self,
        usuario_id: uuid.UUID,
        clase_template_id: uuid.UUID,
        fecha_inicio: date,
        fecha_fin: date,
    ) -> bool:
        result = await self.db.execute(
            select(Suscripcion).where(
                Suscripcion.usuario_id == usuario_id,
                Suscripcion.clase_template_id == clase_template_id,
                Suscripcion.fecha_inicio <= fecha_fin,
                Suscripcion.fecha_fin >= fecha_inicio,
                Suscripcion.activo == True,
            )
        )
        return result.scalars().first() is not None

    async def count_suscripciones_en_fecha(
        self, clase_template_id: uuid.UUID, fecha: date
    ) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                Suscripcion.clase_template_id == clase_template_id,
                Suscripcion.fecha_inicio <= fecha,
                Suscripcion.fecha_fin >= fecha,
                Suscripcion.activo == True,
            )
        )
        return result.scalar() or 0

    async def has_conflicto_suscripcion(
        self,
        usuario_id: uuid.UUID,
        dia_semana: DiaSemana,
        hora_inicio,
        hora_fin,
        fecha_inicio: date,
        fecha_fin: date,
        exclude_template_id: uuid.UUID,
    ) -> bool:
        result = await self.db.execute(
            select(Suscripcion)
            .join(ClaseTemplate, Suscripcion.clase_template_id == ClaseTemplate.id)
            .where(
                Suscripcion.usuario_id == usuario_id,
                Suscripcion.activo == True,
                Suscripcion.clase_template_id != exclude_template_id,
                Suscripcion.fecha_inicio <= fecha_fin,
                Suscripcion.fecha_fin >= fecha_inicio,
                ClaseTemplate.dia_semana == dia_semana,
                ClaseTemplate.hora_inicio < hora_fin,
                ClaseTemplate.hora_fin > hora_inicio,
            )
        )
        return result.scalars().first() is not None

    async def get_conflicto_individual(
        self,
        usuario_id: uuid.UUID,
        fechas: list[date],
        hora_inicio,
        hora_fin,
    ) -> date | None:
        if not fechas:
            return None
        result = await self.db.execute(
            select(ClaseInstancia.fecha)
            .join(Asistencia, Asistencia.clase_instancia_id == ClaseInstancia.id)
            .join(ClaseTemplate, ClaseInstancia.clase_template_id == ClaseTemplate.id)
            .where(
                Asistencia.usuario_id == usuario_id,
                Asistencia.tipo == TipoInscripcion.INDIVIDUAL,
                Asistencia.cancelo == False,
                ClaseInstancia.fecha.in_(fechas),
                ClaseTemplate.hora_inicio < hora_fin,
                ClaseTemplate.hora_fin > hora_inicio,
            )
            .limit(1)
        )
        return result.scalars().first()

    async def get_instancia(
        self, clase_template_id: uuid.UUID, fecha: date
    ) -> ClaseInstancia | None:
        result = await self.db.execute(
            select(ClaseInstancia).where(
                ClaseInstancia.clase_template_id == clase_template_id,
                ClaseInstancia.fecha == fecha,
                ClaseInstancia.activo == True,
            )
        )
        return result.scalars().first()

    async def create_instancia(
        self, clase_template_id: uuid.UUID, fecha: date, cupo: int
    ) -> ClaseInstancia:
        instancia = ClaseInstancia(
            clase_template_id=clase_template_id,
            fecha=fecha,
            cupo=cupo,
        )
        self.db.add(instancia)
        await self.db.flush()
        await self.db.refresh(instancia)
        return instancia

    async def create_asistencia(
        self, usuario_id: uuid.UUID, instancia_id: uuid.UUID
    ) -> Asistencia:
        asistencia = Asistencia(
            usuario_id=usuario_id,
            clase_instancia_id=instancia_id,
            tipo=TipoInscripcion.SUSCRIPCION,
            asistio=False,
            cancelo=False,
        )
        self.db.add(asistencia)
        await self.db.flush()
        await self.db.refresh(asistencia)
        return asistencia

    async def create_suscripcion(
        self,
        usuario_id: uuid.UUID,
        clase_template_id: uuid.UUID,
        monto: Decimal,
        fecha_inicio: date,
        fecha_fin: date,
    ) -> Suscripcion:
        suscripcion = Suscripcion(
            usuario_id=usuario_id,
            clase_template_id=clase_template_id,
            monto=monto,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            activo=True,
        )
        self.db.add(suscripcion)
        await self.db.flush()
        await self.db.refresh(suscripcion)
        return suscripcion

    async def create_pago(
        self,
        usuario_id: uuid.UUID,
        suscripcion_id: uuid.UUID,
        monto: Decimal,
    ) -> Pago:
        pago = Pago(
            usuario_id=usuario_id,
            suscripcion_id=suscripcion_id,
            monto=monto,
            fecha_pago=datetime.now(timezone.utc),
            estado=EstadoPago.PAGADO,
            mp_payment_id="mock",
            descripcion="Pago suscripción mock",
            activo=True,
        )
        self.db.add(pago)
        await self.db.flush()
        await self.db.refresh(pago)
        return pago
