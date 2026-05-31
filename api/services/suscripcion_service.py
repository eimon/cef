import uuid
import calendar
from datetime import date, timedelta, datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from core.enums import DiaSemana
from core.timezone import LOCAL_TZ
from exceptions.general import BadRequestException, ConflictException, NotFoundException
from models.usuario import Usuario
from repositories.suscripcion_repository import SuscripcionRepository
from repositories.precio_disciplina_repository import PrecioDisciplinaRepository
from schemas.suscripcion import SuscripcionCreate, SuscripcionCheckResponse, SuscripcionResponse


_DIA_TO_WEEKDAY = {
    DiaSemana.LUNES: 0,
    DiaSemana.MARTES: 1,
    DiaSemana.MIERCOLES: 2,
    DiaSemana.JUEVES: 3,
    DiaSemana.VIERNES: 4,
    DiaSemana.SABADO: 5,
    DiaSemana.DOMINGO: 6,
}


def _proxima_fecha(dia_semana: DiaSemana) -> date:
    hoy = datetime.now(LOCAL_TZ).date()
    dias = ((_DIA_TO_WEEKDAY[dia_semana] - hoy.weekday()) % 7) or 7
    return hoy + timedelta(days=dias)


def _calcular_fecha_fin(fecha_inicio: date) -> date:
    month = fecha_inicio.month + 1
    year = fecha_inicio.year + (month - 1) // 12
    month = (month - 1) % 12 + 1
    day = min(fecha_inicio.day, calendar.monthrange(year, month)[1])
    return date(year, month, day) - timedelta(days=1)


def _calcular_fechas_clases(fecha_inicio: date, fecha_fin: date) -> list[date]:
    fechas = []
    current = fecha_inicio
    while current <= fecha_fin:
        fechas.append(current)
        current += timedelta(days=7)
    return fechas


class SuscripcionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SuscripcionRepository(db)

    async def _validar_elegibilidad(
        self, current_user: Usuario, clase_template_id: uuid.UUID
    ) -> tuple:
        template = await self.repo.get_template(clase_template_id)
        if not template:
            raise NotFoundException("Clase no encontrada")

        fecha_inicio = _proxima_fecha(template.dia_semana)
        fecha_fin = _calcular_fecha_fin(fecha_inicio)
        fechas_clases = _calcular_fechas_clases(fecha_inicio, fecha_fin)

        if await self.repo.has_suscripcion_activa(
            current_user.id, clase_template_id, fecha_inicio, fecha_fin
        ):
            raise ConflictException("Ya tenés una suscripción activa para esta clase")

        if await self.repo.has_conflicto_suscripcion(
            current_user.id,
            template.dia_semana,
            template.hora_inicio,
            template.hora_fin,
            fecha_inicio,
            fecha_fin,
            clase_template_id,
        ):
            raise ConflictException("Ya tenés una suscripción activa en el mismo día y horario")

        conflicto_fecha = await self.repo.get_conflicto_individual(
            current_user.id, fechas_clases, template.hora_inicio, template.hora_fin
        )
        if conflicto_fecha:
            raise ConflictException(
                f"Tenés una inscripción individual en el mismo horario el {conflicto_fecha.strftime('%d/%m/%Y')}"
            )

        for fecha in fechas_clases:
            count = await self.repo.count_suscripciones_en_fecha(clase_template_id, fecha)
            if count >= template.capacidad_maxima:
                raise BadRequestException(
                    f"No hay cupo disponible para suscripciones el {fecha.strftime('%d/%m/%Y')}"
                )

        return template, fecha_inicio, fecha_fin, fechas_clases

    async def check_elegibilidad(
        self, current_user: Usuario, clase_template_id: uuid.UUID
    ) -> SuscripcionCheckResponse:
        template, fecha_inicio, fecha_fin, fechas_clases = await self._validar_elegibilidad(
            current_user, clase_template_id
        )
        precio_disciplina = await PrecioDisciplinaRepository(self.db).get_by_disciplina(template.disciplina)
        if not precio_disciplina:
            raise BadRequestException("No hay precio configurado para esta disciplina")
        precio = float(precio_disciplina.precio_suscripcion)
        return SuscripcionCheckResponse(
            elegible=True,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            fechas_clases=fechas_clases,
            precio_total=precio,
            monto_minimo=round(precio / 2, 2),
        )

    async def suscribirse(
        self, current_user: Usuario, data: SuscripcionCreate, mp_payment_id: str = "mock"
    ) -> SuscripcionResponse:
        clase_template_id = uuid.UUID(str(data.clase_template_id))
        template, fecha_inicio, fecha_fin, fechas_clases = await self._validar_elegibilidad(
            current_user, clase_template_id
        )

        precio_disciplina = await PrecioDisciplinaRepository(self.db).get_by_disciplina(template.disciplina)
        if not precio_disciplina:
            raise BadRequestException("No hay precio configurado para esta disciplina")
        precio = Decimal(str(precio_disciplina.precio_suscripcion))
        monto_minimo = precio / 2

        if data.monto < monto_minimo:
            raise BadRequestException(
                f"El monto mínimo es el 50% del precio: ${float(monto_minimo):.2f}"
            )
        if data.monto > precio:
            raise BadRequestException(
                f"El monto no puede superar el precio de la suscripción: ${float(precio):.2f}"
            )

        suscripcion = await self.repo.create_suscripcion(
            usuario_id=current_user.id,
            clase_template_id=clase_template_id,
            monto=data.monto,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
        )

        for fecha in fechas_clases:
            instancia = await self.repo.get_instancia(clase_template_id, fecha)
            if instancia:
                instancia.cupo = max(0, instancia.cupo - 1)
            else:
                count = await self.repo.count_suscripciones_en_fecha(clase_template_id, fecha)
                cupo = max(0, template.capacidad_maxima - count)
                instancia = await self.repo.create_instancia(clase_template_id, fecha, cupo)

            await self.repo.create_asistencia(current_user.id, instancia.id)

        pago = await self.repo.create_pago(
            usuario_id=current_user.id,
            suscripcion_id=suscripcion.id,
            monto=data.monto,
            mp_payment_id=mp_payment_id,
        )

        return SuscripcionResponse(
            id=suscripcion.id,
            clase_template_id=suscripcion.clase_template_id,
            pago_id=pago.id,
            monto=float(suscripcion.monto),
            fecha_inicio=suscripcion.fecha_inicio,
            fecha_fin=suscripcion.fecha_fin,
            fechas_clases=fechas_clases,
            activo=suscripcion.activo,
        )
