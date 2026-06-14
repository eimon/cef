import uuid
from decimal import Decimal
from datetime import date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from core.timezone import LOCAL_TZ
from repositories.inscripcion_repository import InscripcionRepository
from repositories.disciplina_repository import DisciplinaRepository
from schemas.inscripcion import InscripcionIndividualCreate, InscripcionResponse
from exceptions.general import BadRequestException, ConflictException, NotFoundException
from models.usuario import Usuario
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from services.suscripcion_service import SuscripcionService


class InscripcionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = InscripcionRepository(db)

    async def _validar_elegibilidad(
        self, current_user: Usuario, clase_template_id: uuid.UUID, fecha: date
    ) -> tuple[ClaseInstancia | None, ClaseTemplate]:
        """Validates all conditions for individual enrollment. Returns (instancia_or_None, template).
        Instancia may be None if it doesn't exist yet (created during payment)."""
        template = await self.repo.get_template(clase_template_id)
        if not template:
            raise NotFoundException("Clase no encontrada")

        await SuscripcionService(self.db).sync_template_subscriptions(clase_template_id)

        clase_inicio = datetime.combine(fecha, template.hora_inicio, tzinfo=LOCAL_TZ)
        if clase_inicio <= datetime.now(LOCAL_TZ):
            raise BadRequestException("Solo podés inscribirte a clases futuras")

        instancia = await self.repo.get_instancia(clase_template_id, fecha)

        if instancia:
            if instancia.cancelada:
                raise BadRequestException("Esta clase fue cancelada y no acepta inscripciones")

            if await self.repo.has_existing_enrollment(current_user.id, instancia.id):
                raise ConflictException("Ya estás inscripto en esta clase")

            active_asistencias = await self.repo.count_active_asistencias(instancia.id)
            if active_asistencias >= template.capacidad_maxima:
                raise BadRequestException("No hay cupo disponible para inscripción individual en esta clase")
        else:
            cupo_reservado = await self.repo.count_active_suscripciones(clase_template_id, fecha)
            if template.capacidad_maxima - cupo_reservado <= 0:
                raise BadRequestException("No hay cupo disponible para inscripción individual en esta clase")

        if await self.repo.has_active_suscripcion(current_user.id, clase_template_id, fecha):
            raise ConflictException(
                "Tenés una suscripción activa para esta clase. "
                "No es necesario inscribirte individualmente."
            )

        if await self.repo.has_schedule_conflict(
            current_user.id,
            fecha,
            template.hora_inicio,
            template.hora_fin,
            exclude_instancia_id=instancia.id if instancia else None,
        ):
            raise ConflictException(
                "Ya tenés otra inscripción en el mismo horario para esta fecha"
            )

        return instancia, template

    async def check_elegibilidad(
        self, current_user: Usuario, clase_template_id: uuid.UUID, fecha: date
    ) -> None:
        await self._validar_elegibilidad(current_user, clase_template_id, fecha)

    async def inscribir_individual(
        self,
        current_user: Usuario,
        data: InscripcionIndividualCreate,
        mp_payment_id: str = "mock",
    ) -> InscripcionResponse:
        clase_template_id = uuid.UUID(str(data.clase_template_id))
        fecha = data.fecha

        instancia, template = await self._validar_elegibilidad(current_user, clase_template_id, fecha)

        disciplina_obj = await DisciplinaRepository(self.db).get_by_nombre(template.disciplina)
        if not disciplina_obj:
            raise BadRequestException("No hay precio configurado para esta disciplina")
        precio = Decimal(str(disciplina_obj.precio_individual))
        monto_minimo = precio / 2

        if data.monto < monto_minimo:
            raise BadRequestException(
                f"El monto mínimo es el 50% del precio: ${float(monto_minimo):.2f}"
            )
        if data.monto > precio:
            raise BadRequestException(
                f"El monto no puede superar el precio de la clase: ${float(precio):.2f}"
            )

        if instancia is None:
            cupo_reservado = await self.repo.count_active_suscripciones(clase_template_id, fecha)
            cupo_disponible = template.capacidad_maxima - cupo_reservado
            instancia = await self.repo.get_or_create_instancia(clase_template_id, fecha, cupo_disponible)

        asistencia, pago = await self.repo.create_inscripcion_individual(
            current_user.id, instancia, data.monto, mp_payment_id=mp_payment_id
        )

        return InscripcionResponse(
            asistencia_id=asistencia.id,
            pago_id=pago.id,
            monto=float(pago.monto),
            clase_instancia_id=instancia.id,
        )
