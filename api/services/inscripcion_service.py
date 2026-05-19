import uuid
from decimal import Decimal
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from repositories.inscripcion_repository import InscripcionRepository
from schemas.inscripcion import InscripcionIndividualCreate, InscripcionResponse
from exceptions.general import BadRequestException, ConflictException, NotFoundException
from models.usuario import Usuario


class InscripcionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = InscripcionRepository(db)

    async def _validar_elegibilidad(self, current_user: Usuario, instancia_id: uuid.UUID) -> tuple:
        """Validates all conditions for individual enrollment. Returns (instancia, template).
        Raises domain exceptions on failure."""
        instancia = await self.repo.get_instancia_with_template(instancia_id)
        if not instancia:
            raise NotFoundException("Clase no encontrada")

        if instancia.cancelada:
            raise BadRequestException("Esta clase fue cancelada y no acepta inscripciones")

        if instancia.fecha <= date.today():
            raise BadRequestException("Solo podés inscribirte a clases futuras")

        if await self.repo.has_existing_enrollment(current_user.id, instancia_id):
            raise ConflictException("Ya estás inscripto en esta clase")

        cupo_disponible = instancia.cupo_oculto - await self.repo.count_individual_asistencias(instancia_id)
        if cupo_disponible <= 0:
            raise BadRequestException("No hay cupo disponible para inscripción individual en esta clase")

        if await self.repo.has_active_suscripcion(current_user.id, instancia.fecha):
            raise ConflictException(
                "Tenés una suscripción activa que ya cubre esta fecha. "
                "No es necesario inscribirte individualmente."
            )

        template = instancia.clase_template
        if await self.repo.has_schedule_conflict(
            current_user.id,
            instancia.fecha,
            template.hora_inicio,
            template.hora_fin,
            exclude_instancia_id=instancia_id,
        ):
            raise ConflictException(
                "Ya tenés otra inscripción en el mismo horario para esta fecha"
            )

        return instancia, template

    async def check_elegibilidad(self, current_user: Usuario, instancia_id: uuid.UUID) -> None:
        """Validates enrollment conditions without creating anything."""
        await self._validar_elegibilidad(current_user, instancia_id)

    async def inscribir_individual(
        self,
        current_user: Usuario,
        data: InscripcionIndividualCreate,
    ) -> InscripcionResponse:
        instancia_id = uuid.UUID(str(data.clase_instancia_id))
        instancia, template = await self._validar_elegibilidad(current_user, instancia_id)

        precio = Decimal(str(template.precio_individual))
        monto_minimo = precio / 2

        if data.monto < monto_minimo:
            raise BadRequestException(
                f"El monto mínimo es el 50% del precio: ${float(monto_minimo):.2f}"
            )
        if data.monto > precio:
            raise BadRequestException(
                f"El monto no puede superar el precio de la clase: ${float(precio):.2f}"
            )

        asistencia, pago = await self.repo.create_inscripcion_individual(
            current_user.id, instancia_id, data.monto
        )

        return InscripcionResponse(
            asistencia_id=asistencia.id,
            pago_id=pago.id,
            monto=float(pago.monto),
            clase_instancia_id=instancia_id,
        )
