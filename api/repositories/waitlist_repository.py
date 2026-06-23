import uuid
from datetime import date, datetime, time

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.enums import EstadoSuscripcion, EstadoWaitlist, TipoInscripcion
from models.asistencia import Asistencia
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.suscripciones import Suscripcion
from models.usuario import Usuario
from models.waitlist_entry import WaitlistEntry


ACTIVE_WAITLIST_STATES = (EstadoWaitlist.EN_ESPERA, EstadoWaitlist.NOTIFICADO)


class WaitlistRepository:
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

    async def has_existing_enrollment(self, usuario_id: uuid.UUID, instancia_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(Asistencia.id).where(
                Asistencia.usuario_id == usuario_id,
                Asistencia.clase_instancia_id == instancia_id,
                Asistencia.cancelo == False,
            )
        )
        return result.first() is not None

    async def has_active_suscripcion(
        self, usuario_id: uuid.UUID, clase_template_id: uuid.UUID, fecha: date
    ) -> bool:
        result = await self.db.execute(
            select(Suscripcion.id).where(
                Suscripcion.usuario_id == usuario_id,
                Suscripcion.clase_template_id == clase_template_id,
                Suscripcion.fecha_inicio <= fecha,
                Suscripcion.fecha_fin >= fecha,
                Suscripcion.activo == True,
                Suscripcion.estado != EstadoSuscripcion.VENCIDA,
            )
        )
        return result.first() is not None

    async def count_active_suscripciones(self, clase_template_id: uuid.UUID, fecha: date) -> int:
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

    async def has_active_waitlist(
        self, usuario_id: uuid.UUID, clase_template_id: uuid.UUID, fecha: date
    ) -> bool:
        result = await self.db.execute(
            select(WaitlistEntry.id).where(
                WaitlistEntry.usuario_id == usuario_id,
                WaitlistEntry.clase_template_id == clase_template_id,
                WaitlistEntry.fecha == fecha,
                WaitlistEntry.activo == True,
                WaitlistEntry.estado.in_(ACTIVE_WAITLIST_STATES),
            )
        )
        return result.first() is not None

    async def get_next_position(self, clase_template_id: uuid.UUID, fecha: date) -> int:
        result = await self.db.execute(
            select(func.max(WaitlistEntry.posicion)).where(
                WaitlistEntry.clase_template_id == clase_template_id,
                WaitlistEntry.fecha == fecha,
                WaitlistEntry.activo == True,
                WaitlistEntry.estado.in_(ACTIVE_WAITLIST_STATES),
            )
        )
        max_pos = result.scalar()
        return int(max_pos or 0) + 1

    async def create(self, usuario_id: uuid.UUID, clase_template_id: uuid.UUID, fecha: date) -> WaitlistEntry:
        posicion = await self.get_next_position(clase_template_id, fecha)
        entry = WaitlistEntry(
            usuario_id=usuario_id,
            clase_template_id=clase_template_id,
            fecha=fecha,
            posicion=posicion,
            estado=EstadoWaitlist.EN_ESPERA,
            activo=True,
        )
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        return entry

    async def get_user_entries(self, usuario_id: uuid.UUID) -> list[tuple[WaitlistEntry, ClaseTemplate]]:
        result = await self.db.execute(
            select(WaitlistEntry, ClaseTemplate)
            .join(ClaseTemplate, ClaseTemplate.id == WaitlistEntry.clase_template_id)
            .where(
                WaitlistEntry.usuario_id == usuario_id,
                WaitlistEntry.activo == True,
                WaitlistEntry.estado.in_(ACTIVE_WAITLIST_STATES),
            )
            .order_by(WaitlistEntry.fecha.asc(), WaitlistEntry.posicion.asc())
        )
        return result.all()

    async def get_entry_by_id(self, waitlist_id: uuid.UUID) -> WaitlistEntry | None:
        result = await self.db.execute(
            select(WaitlistEntry).where(WaitlistEntry.id == waitlist_id)
        )
        return result.scalars().first()

    async def get_entry_by_id_for_update(self, waitlist_id: uuid.UUID) -> WaitlistEntry | None:
        result = await self.db.execute(
            select(WaitlistEntry)
            .where(WaitlistEntry.id == waitlist_id)
            .with_for_update()
        )
        return result.scalars().first()

    async def get_next_pending_for_slot(
        self,
        clase_template_id: uuid.UUID,
        fecha: date,
    ) -> WaitlistEntry | None:
        result = await self.db.execute(
            select(WaitlistEntry)
            .where(
                WaitlistEntry.clase_template_id == clase_template_id,
                WaitlistEntry.fecha == fecha,
                WaitlistEntry.activo == True,
                WaitlistEntry.estado == EstadoWaitlist.EN_ESPERA,
            )
            .order_by(WaitlistEntry.posicion.asc(), WaitlistEntry.created_at.asc())
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        return result.scalars().first()

    async def expire_due_notified_entries(self, now: datetime) -> list[WaitlistEntry]:
        result = await self.db.execute(
            select(WaitlistEntry)
            .where(
                WaitlistEntry.activo == True,
                WaitlistEntry.estado == EstadoWaitlist.NOTIFICADO,
                WaitlistEntry.expira_at.is_not(None),
                WaitlistEntry.expira_at <= now,
            )
            .with_for_update(skip_locked=True)
        )
        entries = list(result.scalars().all())
        for entry in entries:
            entry.estado = EstadoWaitlist.EXPIRADO
            entry.activo = False
        return entries

    async def has_active_notified_for_slot(
        self,
        clase_template_id: uuid.UUID,
        fecha: date,
    ) -> bool:
        result = await self.db.execute(
            select(WaitlistEntry.id).where(
                WaitlistEntry.clase_template_id == clase_template_id,
                WaitlistEntry.fecha == fecha,
                WaitlistEntry.activo == True,
                WaitlistEntry.estado == EstadoWaitlist.NOTIFICADO,
            )
        )
        return result.first() is not None

    async def shift_positions_after(
        self,
        clase_template_id: uuid.UUID,
        fecha: date,
        posicion: int,
    ) -> None:
        result = await self.db.execute(
            select(WaitlistEntry)
            .where(
                WaitlistEntry.clase_template_id == clase_template_id,
                WaitlistEntry.fecha == fecha,
                WaitlistEntry.activo == True,
                WaitlistEntry.posicion > posicion,
                WaitlistEntry.estado.in_(ACTIVE_WAITLIST_STATES),
            )
            .order_by(WaitlistEntry.posicion.asc())
            .with_for_update(skip_locked=True)
        )
        entries = list(result.scalars().all())
        for entry in entries:
            entry.posicion -= 1

    async def has_schedule_conflict(
        self,
        usuario_id: uuid.UUID,
        fecha: date,
        hora_inicio: time,
        hora_fin: time,
    ) -> bool:
        query = (
            select(Asistencia.id)
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
        result = await self.db.execute(query)
        return result.first() is not None

    async def count_active_waitlist_for_slot(self, clase_template_id: uuid.UUID, fecha: date) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                WaitlistEntry.clase_template_id == clase_template_id,
                WaitlistEntry.fecha == fecha,
                WaitlistEntry.activo == True,
                WaitlistEntry.estado.in_(ACTIVE_WAITLIST_STATES),
            )
        )
        return int(result.scalar() or 0)

    async def get_usuario(self, usuario_id: uuid.UUID) -> Usuario | None:
        result = await self.db.execute(
            select(Usuario).where(Usuario.id == usuario_id)
        )
        return result.scalars().first()