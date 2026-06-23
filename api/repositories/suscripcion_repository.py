import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from core.enums import DiaSemana, TipoInscripcion, EstadoPago, EstadoSuscripcion
from models.asistencia import Asistencia
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.pagos import Pago
from models.suscripciones import Suscripcion, SuscripcionReserva
from models.usuario import Usuario


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
                Suscripcion.estado != EstadoSuscripcion.VENCIDA,
            )
        )
        return result.scalars().first() is not None

    async def get_suscripcion_by_id_for_user(
        self, suscripcion_id: uuid.UUID, usuario_id: uuid.UUID
    ) -> Suscripcion | None:
        result = await self.db.execute(
            select(Suscripcion)
            .options(selectinload(Suscripcion.clase_template))
            .where(
                Suscripcion.id == suscripcion_id,
                Suscripcion.usuario_id == usuario_id,
                Suscripcion.activo == True,
            )
        )
        return result.scalars().first()

    async def get_suscripciones_for_renewal(self, usuario_id: uuid.UUID) -> list[Suscripcion]:
        result = await self.db.execute(
            select(Suscripcion)
            .options(selectinload(Suscripcion.clase_template))
            .where(
                Suscripcion.usuario_id == usuario_id,
                Suscripcion.activo == True,
            )
            .order_by(Suscripcion.clase_template_id, Suscripcion.fecha_inicio.desc(), Suscripcion.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_suscripciones_for_template(self, clase_template_id: uuid.UUID) -> list[Suscripcion]:
        result = await self.db.execute(
            select(Suscripcion)
            .options(selectinload(Suscripcion.clase_template))
            .where(
                Suscripcion.clase_template_id == clase_template_id,
                Suscripcion.activo == True,
            )
        )
        return list(result.scalars().all())

    async def get_latest_suscripcion_for_template(
        self, usuario_id: uuid.UUID, clase_template_id: uuid.UUID
    ) -> Suscripcion | None:
        result = await self.db.execute(
            select(Suscripcion)
            .where(
                Suscripcion.usuario_id == usuario_id,
                Suscripcion.clase_template_id == clase_template_id,
                Suscripcion.activo == True,
            )
            .order_by(Suscripcion.fecha_inicio.desc(), Suscripcion.created_at.desc())
            .limit(1)
        )
        return result.scalars().first()

    async def get_next_suscripcion_for_template(
        self, usuario_id: uuid.UUID, clase_template_id: uuid.UUID, after_date: date
    ) -> Suscripcion | None:
        result = await self.db.execute(
            select(Suscripcion)
            .where(
                Suscripcion.usuario_id == usuario_id,
                Suscripcion.clase_template_id == clase_template_id,
                Suscripcion.fecha_inicio > after_date,
                Suscripcion.activo == True,
            )
            .order_by(Suscripcion.fecha_inicio.asc(), Suscripcion.created_at.asc())
            .limit(1)
        )
        return result.scalars().first()

    async def has_paid_payment(self, suscripcion_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(Pago.id)
            .where(
                Pago.suscripcion_id == suscripcion_id,
                Pago.estado == EstadoPago.PAGADO,
                Pago.activo == True,
            )
            .limit(1)
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
                Suscripcion.estado != EstadoSuscripcion.VENCIDA,
            )
        )
        return result.scalar() or 0

    async def count_active_suscripciones(self, clase_template_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                Suscripcion.clase_template_id == clase_template_id,
                Suscripcion.activo == True,
                Suscripcion.estado != EstadoSuscripcion.VENCIDA,
            )
        )
        return result.scalar() or 0

    async def count_active_reservas_en_fecha(
        self, clase_template_id: uuid.UUID, fecha: date
    ) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(SuscripcionReserva)
            .join(ClaseInstancia, SuscripcionReserva.clase_instancia_id == ClaseInstancia.id)
            .where(
                ClaseInstancia.clase_template_id == clase_template_id,
                ClaseInstancia.fecha == fecha,
                SuscripcionReserva.activa == True,
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
                Suscripcion.estado != EstadoSuscripcion.VENCIDA,
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

    async def count_active_asistencias(self, instancia_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                Asistencia.clase_instancia_id == instancia_id,
                Asistencia.cancelo == False,
            )
        )
        return result.scalar() or 0

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

    async def create_reserva(
        self, suscripcion_id: uuid.UUID, instancia_id: uuid.UUID
    ) -> SuscripcionReserva:
        reserva = SuscripcionReserva(
            suscripcion_id=suscripcion_id,
            clase_instancia_id=instancia_id,
            activa=True,
        )
        self.db.add(reserva)
        await self.db.flush()
        await self.db.refresh(reserva)
        return reserva

    async def get_active_future_reservas(self, suscripcion_id: uuid.UUID, from_date: date) -> list[SuscripcionReserva]:
        result = await self.db.execute(
            select(SuscripcionReserva)
            .options(selectinload(SuscripcionReserva.clase_instancia))
            .join(ClaseInstancia, SuscripcionReserva.clase_instancia_id == ClaseInstancia.id)
            .where(
                SuscripcionReserva.suscripcion_id == suscripcion_id,
                SuscripcionReserva.activa == True,
                ClaseInstancia.fecha >= from_date,
            )
        )
        return list(result.scalars().all())

    async def mark_subscription_state(
        self, suscripcion: Suscripcion, estado: EstadoSuscripcion
    ) -> Suscripcion:
        suscripcion.estado = estado
        await self.db.flush()
        return suscripcion

    async def release_future_reservas(self, suscripcion: Suscripcion, from_date: date) -> None:
        reservas = await self.get_active_future_reservas(suscripcion.id, from_date)
        for reserva in reservas:
            reserva.activa = False
            if reserva.clase_instancia:
                reserva.clase_instancia.cupo += 1

            asistencia = (await self.db.execute(
                select(Asistencia).where(
                    Asistencia.usuario_id == suscripcion.usuario_id,
                    Asistencia.clase_instancia_id == reserva.clase_instancia_id,
                    Asistencia.tipo == TipoInscripcion.SUSCRIPCION,
                    Asistencia.cancelo == False,
                )
            )).scalars().first()
            if asistencia:
                if asistencia.asistio:
                    # Keep attended classes — they represent an unpaid debt
                    pass
                else:
                    await self.db.delete(asistencia)
        await self.db.flush()

    async def get_activas_con_clases_finalizadas(self, before_date: date) -> list[Suscripcion]:
        result = await self.db.execute(
            select(Suscripcion)
            .options(selectinload(Suscripcion.clase_template))
            .where(
                Suscripcion.activo == True,
                Suscripcion.fecha_fin < before_date,
            )
        )
        return list(result.scalars().all())

    async def get_renovables_proximos_a_vencer(self, target_fecha_pago: date) -> list[tuple]:
        """Returns (suscripcion, usuario, clase_template) for RENOVABLE subs without paid payment
        whose expiry date is target_fecha_pago + RENOVABLE_AFTER_DAYS + plazo_pago_dias.
        Caller computes target_fecha_pago = today - RENOVABLE_AFTER_DAYS - plazo_pago_dias + dias_aviso."""
        paid_subquery = (
            select(Pago.suscripcion_id)
            .where(Pago.estado == EstadoPago.PAGADO, Pago.activo == True)
            .scalar_subquery()
        )
        result = await self.db.execute(
            select(Suscripcion, Usuario, ClaseTemplate)
            .join(Usuario, Suscripcion.usuario_id == Usuario.id)
            .join(ClaseTemplate, Suscripcion.clase_template_id == ClaseTemplate.id)
            .where(
                Suscripcion.estado == EstadoSuscripcion.RENOVABLE,
                Suscripcion.activo == True,
                Suscripcion.fecha_pago == target_fecha_pago,
                Suscripcion.id.not_in(paid_subquery),
            )
        )
        return list(result.all())

    async def get_all_activas(self) -> list[Suscripcion]:
        result = await self.db.execute(
            select(Suscripcion)
            .options(selectinload(Suscripcion.clase_template))
            .where(Suscripcion.activo == True)
        )
        return list(result.scalars().all())

    async def get_reserva_by_instancia_and_usuario(
        self, instancia_id: uuid.UUID, usuario_id: uuid.UUID
    ) -> SuscripcionReserva | None:
        result = await self.db.execute(
            select(SuscripcionReserva)
            .join(Suscripcion, SuscripcionReserva.suscripcion_id == Suscripcion.id)
            .where(
                SuscripcionReserva.clase_instancia_id == instancia_id,
                SuscripcionReserva.activa == True,
                Suscripcion.usuario_id == usuario_id,
            )
        )
        return result.scalars().first()

    async def count_reservas_by_suscripcion(self, suscripcion_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).where(SuscripcionReserva.suscripcion_id == suscripcion_id)
        )
        return result.scalar() or 0

    async def create_suscripcion(
        self,
        usuario_id: uuid.UUID,
        clase_template_id: uuid.UUID,
        monto: Decimal,
        fecha_inicio: date,
        fecha_fin: date,
        fecha_pago: date,
        estado: EstadoSuscripcion = EstadoSuscripcion.VIGENTE,
    ) -> Suscripcion:
        suscripcion = Suscripcion(
            usuario_id=usuario_id,
            clase_template_id=clase_template_id,
            monto=monto,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            fecha_pago=fecha_pago,
            estado=estado,
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
        mp_payment_id: str = "mock",
        estado: EstadoPago = EstadoPago.PAGADO,
    ) -> Pago:
        pago = Pago(
            usuario_id=usuario_id,
            suscripcion_id=suscripcion_id,
            monto=monto,
            fecha_pago=datetime.now(timezone.utc),
            estado=estado,
            mp_payment_id=mp_payment_id,
            descripcion="Pago suscripción" if mp_payment_id != "mock" else "Pago suscripción mock",
            activo=True,
        )
        self.db.add(pago)
        await self.db.flush()
        await self.db.refresh(pago)
        return pago
