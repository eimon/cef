import uuid
from datetime import date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from core.enums import EstadoWaitlist
from core.timezone import LOCAL_TZ
from exceptions.general import BadRequestException, ConflictException, NotFoundException
from models.clase_template import ClaseTemplate
from models.waitlist_entry import WaitlistEntry
from models.usuario import Usuario
from repositories.waitlist_repository import WaitlistRepository
from schemas.inscripcion import (
    WaitlistEntryResponse,
    WaitlistJoinCreate,
    WaitlistJoinResponse,
    WaitlistStatusResponse,
)
from services.email_service import EmailService
from services.waitlist_suscripcion_service import WaitlistSuscripcionService


class WaitlistService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = WaitlistRepository(db)

    async def _expire_due_entries(self) -> set[tuple[uuid.UUID, date]]:
        now = datetime.now(LOCAL_TZ)
        expired_entries = await self.repo.expire_due_notified_entries(now)
        slots: set[tuple[uuid.UUID, date]] = set()
        for entry in expired_entries:
            await self.repo.shift_positions_after(
                entry.clase_template_id,
                entry.fecha,
                entry.posicion,
            )
            slots.add((entry.clase_template_id, entry.fecha))
        return slots

    async def _slot_has_capacity(self, clase_template_id: uuid.UUID, fecha: date) -> bool:
        instancia = await self.repo.get_instancia(clase_template_id, fecha)
        if instancia:
            return not instancia.cancelada and instancia.cupo > 0

        template = await self.repo.get_template(clase_template_id)
        if not template:
            return False

        cupo_reservado = await self.repo.count_active_suscripciones(clase_template_id, fecha)
        return (template.capacidad_maxima - cupo_reservado) > 0

    async def _trigger_individual_promotion_for_slot(self, clase_template_id: uuid.UUID, fecha: date) -> None:
        await self._expire_due_entries()

        if not await self._slot_has_capacity(clase_template_id, fecha):
            return

        if await self.repo.has_active_notified_for_slot(clase_template_id, fecha):
            return

        entry = await self.repo.get_next_pending_for_slot(clase_template_id, fecha)
        if not entry:
            return

        template = await self.repo.get_template(clase_template_id)
        if not template:
            return

        entry.estado = EstadoWaitlist.NOTIFICADO
        entry.notificado_at = datetime.now(LOCAL_TZ)
        entry.expira_at = datetime.combine(fecha, template.hora_fin, tzinfo=LOCAL_TZ)
        await self.db.flush()

        usuario = await self.repo.get_usuario(entry.usuario_id)
        if usuario and usuario.email:
            await EmailService().send_waitlist_slot_available(
                to_email=usuario.email,
                clase_nombre=template.nombre,
                fecha=entry.fecha.isoformat(),
                expira_at=entry.expira_at,
                waitlist_id=str(entry.id),
                nombre=usuario.nombre,
            )

    async def trigger_promotion_for_slot(self, clase_template_id: uuid.UUID, fecha: date) -> None:
        # Priority rule: subscription queue first, then individual fallback.
        suscripcion_result = await WaitlistSuscripcionService(self.db).trigger_promotion_for_slot(
            clase_template_id,
            fecha,
        )
        if suscripcion_result in ("promoted", "blocked"):
            return

        await self._trigger_individual_promotion_for_slot(clase_template_id, fecha)

    async def join_waitlist(self, current_user: Usuario, data: WaitlistJoinCreate) -> WaitlistJoinResponse:
        clase_template_id = uuid.UUID(str(data.clase_template_id))
        fecha = data.fecha

        template = await self.repo.get_template(clase_template_id)
        if not template:
            raise NotFoundException("Clase no encontrada")

        clase_inicio = datetime.combine(fecha, template.hora_inicio, tzinfo=LOCAL_TZ)
        if clase_inicio <= datetime.now(LOCAL_TZ):
            raise BadRequestException("Solo podés anotarte en lista de espera para clases futuras")

        instancia = await self.repo.get_instancia(clase_template_id, fecha)
        if instancia and instancia.cancelada:
            raise BadRequestException("Esta clase fue cancelada y no acepta lista de espera")

        if instancia and await self.repo.has_existing_enrollment(current_user.id, instancia.id):
            raise ConflictException("Ya estás inscripto en esta clase")

        if await self.repo.has_active_suscripcion(current_user.id, clase_template_id, fecha):
            raise ConflictException("Ya tenés una suscripción activa para esta clase")

        if await self.repo.has_active_waitlist(current_user.id, clase_template_id, fecha):
            raise ConflictException("Ya estás anotado en la lista de espera de esta clase")

        if await self.repo.has_schedule_conflict(
            current_user.id,
            fecha,
            template.hora_inicio,
            template.hora_fin,
        ):
            raise ConflictException("Ya tenés otra inscripción en el mismo horario para esta fecha")

        if instancia:
            if instancia.cupo > 0:
                raise BadRequestException("Hay cupo disponible. Podés inscribirte directamente")
        else:
            cupo_reservado = await self.repo.count_active_suscripciones(clase_template_id, fecha)
            cupo_disponible = template.capacidad_maxima - cupo_reservado
            if cupo_disponible > 0:
                raise BadRequestException("Hay cupo disponible. Podés inscribirte directamente")

        entry = await self.repo.create(current_user.id, clase_template_id, fecha)
        return WaitlistJoinResponse(
            waitlist_id=entry.id,
            posicion=entry.posicion,
            estado=entry.estado,
            clase_template_id=entry.clase_template_id,
            fecha=entry.fecha,
        )

    async def list_my_waitlist(self, current_user: Usuario) -> list[WaitlistEntryResponse]:
        expired_slots = await self._expire_due_entries()
        for slot_template_id, slot_fecha in expired_slots:
            await self.trigger_promotion_for_slot(slot_template_id, slot_fecha)
        rows = await self.repo.get_user_entries(current_user.id)
        return [
            WaitlistEntryResponse(
                id=entry.id,
                clase_template_id=entry.clase_template_id,
                clase_nombre=template.nombre,
                disciplina=template.disciplina,
                fecha=entry.fecha,
                posicion=entry.posicion,
                estado=entry.estado,
                notificado_at=entry.notificado_at,
                expira_at=entry.expira_at,
                created_at=entry.created_at,
            )
            for entry, template in rows
        ]

    async def cancel_waitlist(self, current_user: Usuario, waitlist_id: uuid.UUID) -> None:
        expired_slots = await self._expire_due_entries()
        for slot_template_id, slot_fecha in expired_slots:
            await self.trigger_promotion_for_slot(slot_template_id, slot_fecha)
        entry = await self.repo.get_entry_by_id_for_update(waitlist_id)
        if not entry or entry.usuario_id != current_user.id:
            raise NotFoundException("Entrada de lista de espera no encontrada")

        if not entry.activo or entry.estado not in (EstadoWaitlist.EN_ESPERA, EstadoWaitlist.NOTIFICADO):
            raise BadRequestException("La entrada de lista de espera no está activa")

        entry.activo = False
        entry.estado = EstadoWaitlist.CANCELADO
        await self.repo.shift_positions_after(entry.clase_template_id, entry.fecha, entry.posicion)
        await self.db.flush()

        await self.trigger_promotion_for_slot(entry.clase_template_id, entry.fecha)

    async def get_status(self, current_user: Usuario, waitlist_id: uuid.UUID) -> WaitlistStatusResponse:
        expired_slots = await self._expire_due_entries()
        for slot_template_id, slot_fecha in expired_slots:
            await self.trigger_promotion_for_slot(slot_template_id, slot_fecha)
        entry = await self.repo.get_entry_by_id(waitlist_id)
        if not entry or entry.usuario_id != current_user.id:
            raise NotFoundException("Entrada de lista de espera no encontrada")

        return WaitlistStatusResponse(
            id=entry.id,
            estado=entry.estado,
            posicion=entry.posicion,
            expira_at=entry.expira_at,
        )

    async def get_entry_for_payment(
        self,
        current_user: Usuario,
        waitlist_id: uuid.UUID,
    ) -> tuple[WaitlistEntry, ClaseTemplate]:
        expired_slots = await self._expire_due_entries()
        for slot_template_id, slot_fecha in expired_slots:
            await self.trigger_promotion_for_slot(slot_template_id, slot_fecha)

        entry = await self.repo.get_entry_by_id_for_update(waitlist_id)
        if not entry or entry.usuario_id != current_user.id:
            raise NotFoundException("Entrada de lista de espera no encontrada")

        if not entry.activo:
            raise BadRequestException("La entrada de lista de espera ya no está activa")

        if entry.estado != EstadoWaitlist.NOTIFICADO:
            raise BadRequestException("Todavía no tenés un cupo liberado para confirmar")

        if entry.expira_at and entry.expira_at <= datetime.now(LOCAL_TZ):
            entry.estado = EstadoWaitlist.EXPIRADO
            entry.activo = False
            await self.repo.shift_positions_after(entry.clase_template_id, entry.fecha, entry.posicion)
            await self.db.flush()
            await self.trigger_promotion_for_slot(entry.clase_template_id, entry.fecha)
            raise BadRequestException("El aviso de cupo liberado ya expiró")

        if not await self._slot_has_capacity(entry.clase_template_id, entry.fecha):
            raise BadRequestException("El cupo ya no está disponible")

        template = await self.repo.get_template(entry.clase_template_id)
        if not template:
            raise NotFoundException("Clase no encontrada")

        return entry, template

    async def mark_confirmed_paid(self, waitlist_id: uuid.UUID) -> WaitlistEntry:
        entry = await self.repo.get_entry_by_id_for_update(waitlist_id)
        if not entry:
            raise NotFoundException("Entrada de lista de espera no encontrada")

        entry.estado = EstadoWaitlist.CONFIRMADO_PAGADO
        entry.activo = False
        await self.repo.shift_positions_after(entry.clase_template_id, entry.fecha, entry.posicion)
        await self.db.flush()
        return entry