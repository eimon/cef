import calendar
from datetime import date, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
import uuid

from repositories.clase_template_repository import ClaseTemplateRepository
from repositories.clase_instancia_repository import ClaseInstanciaRepository
from repositories.disciplina_repository import DisciplinaRepository
from repositories.sala_repository import SalaRepository
from schemas.clase_template import ClaseTemplateCreate, ClaseTemplateUpdate, ClaseTemplateResponse
from schemas.clase_semana import ClaseSemanaResponse, InstanciaSemanaResponse
from exceptions.general import NotFoundException, BadRequestException, SalaOcupadaException, ProfesorOcupadoException, ClaseConInscriptosException
from services.email_service import EmailService
from core.enums import DiaSemana, TipoInscripcion, EstadoSuscripcion, EstadoWaitlist, EstadoLicencia
from models.asistencia import Asistencia
from models.clase_template import ClaseTemplate
from models.licencia import Licencia
from models.suscripciones import Suscripcion
from models.usuario import Usuario
from models.waitlist_entry import WaitlistEntry
from services.suscripcion_service import SuscripcionService

_WEEKDAY_TO_DIA: dict[int, DiaSemana] = {
    0: DiaSemana.LUNES,
    1: DiaSemana.MARTES,
    2: DiaSemana.MIERCOLES,
    3: DiaSemana.JUEVES,
    4: DiaSemana.VIERNES,
    5: DiaSemana.SABADO,
    6: DiaSemana.DOMINGO,
}

_DIA_OFFSET: dict[DiaSemana, int] = {
    DiaSemana.DOMINGO: 0,
    DiaSemana.LUNES: 1,
    DiaSemana.MARTES: 2,
    DiaSemana.MIERCOLES: 3,
    DiaSemana.JUEVES: 4,
    DiaSemana.VIERNES: 5,
    DiaSemana.SABADO: 6,
}

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


class ClaseTemplateService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ClaseTemplateRepository(db)

    async def _load_precios(self) -> dict[str, tuple[float, float]]:
        items = await DisciplinaRepository(self.db).get_all()
        return {d.nombre.lower(): (float(d.precio_individual), float(d.precio_suscripcion)) for d in items}

    def _to_response(self, clase, precios: dict[str, tuple[float, float]]) -> ClaseTemplateResponse:
        pi, ps = precios.get(clase.disciplina.lower(), (0.0, 0.0))
        return ClaseTemplateResponse(
            id=clase.id,
            nombre=clase.nombre,
            descripcion=clase.descripcion,
            disciplina=clase.disciplina,
            dia_semana=clase.dia_semana,
            hora_inicio=clase.hora_inicio,
            hora_fin=clase.hora_fin,
            capacidad_maxima=clase.capacidad_maxima,
            precio_individual=pi,
            precio_suscripcion=ps,
            profesor_id=clase.profesor_id,
            sala_id=clase.sala_id,
            profesor_nombre=(
                f"{clase.profesor.nombre} {clase.profesor.apellido}"
                if clase.profesor else None
            ),
            sala_nombre=clase.sala.nombre if clase.sala else None,
            activo=clase.activo,
            created_at=clase.created_at,
            updated_at=clase.updated_at,
        )

    async def _validar_capacidad_sala(self, sala_id, capacidad_maxima: int) -> None:
        sala = await SalaRepository(self.db).get_by_id(sala_id)
        if sala and sala.capacidad is not None and capacidad_maxima > sala.capacidad:
            raise BadRequestException(
                f"El cupo de la clase ({capacidad_maxima}) no puede superar la capacidad de la sala ({sala.capacidad})"
            )

    async def _get_replacement_profesor_for_date(
        self, profesor_id: uuid.UUID, target_date: date
    ) -> uuid.UUID | None:
        """
        Check if profesor has an approved license covering target_date.
        If yes, return the replacement profesor_id. Otherwise return None.
        """
        result = await self.db.execute(
            select(Licencia.profesor_reemplazo_id).where(
                Licencia.profesor_id == profesor_id,
                Licencia.estado == EstadoLicencia.APROBADA,
                Licencia.fecha_inicio <= target_date,
                Licencia.fecha_fin >= target_date,
                Licencia.activo == True,
            )
        )
        replacement = result.scalar()
        return replacement

    async def create(self, data: ClaseTemplateCreate) -> ClaseTemplateResponse:
        disciplina_obj = await DisciplinaRepository(self.db).get_by_nombre(data.disciplina)
        if not disciplina_obj:
            raise BadRequestException("Disciplina no encontrada")

        await self._validar_capacidad_sala(data.sala_id, data.capacidad_maxima)

        if await self.repo.get_conflicting_sala(data.sala_id, data.dia_semana, data.hora_inicio, data.hora_fin):
            raise SalaOcupadaException()

        if await self.repo.get_conflicting_profesor(data.profesor_id, data.dia_semana, data.hora_inicio, data.hora_fin):
            raise ProfesorOcupadoException()

        nombre = disciplina_obj.nombre.capitalize()
        clase = ClaseTemplate(
            nombre=nombre,
            disciplina=disciplina_obj.nombre,
            dia_semana=data.dia_semana,
            hora_inicio=data.hora_inicio,
            hora_fin=data.hora_fin,
            sala_id=data.sala_id,
            profesor_id=data.profesor_id,
            capacidad_maxima=data.capacidad_maxima,
        )
        clase = await self.repo.create(clase)
        clase = await self.repo.get_by_id(clase.id)
        precios = await self._load_precios()
        return self._to_response(clase, precios)

    async def delete(self, clase_id: uuid.UUID) -> None:
        clase = await self.repo.get_by_id(clase_id)
        if not clase:
            raise NotFoundException("Clase no encontrada")
        if await self.repo.has_inscriptos(clase_id):
            raise ClaseConInscriptosException()
        await self.repo.soft_delete(clase)

    async def update(self, clase_id: uuid.UUID, data: ClaseTemplateUpdate) -> ClaseTemplateResponse:
        clase = await self.repo.get_by_id(clase_id)
        if not clase:
            raise NotFoundException("Clase no encontrada")

        disciplina_obj = await DisciplinaRepository(self.db).get_by_nombre(data.disciplina)
        if not disciplina_obj:
            raise BadRequestException("Disciplina no encontrada")

        await self._validar_capacidad_sala(data.sala_id, data.capacidad_maxima)

        if await self.repo.get_conflicting_sala(data.sala_id, data.dia_semana, data.hora_inicio, data.hora_fin, exclude_id=clase_id):
            raise SalaOcupadaException()

        if await self.repo.get_conflicting_profesor(data.profesor_id, data.dia_semana, data.hora_inicio, data.hora_fin, exclude_id=clase_id):
            raise ProfesorOcupadoException()

        emails = await self.repo.get_enrolled_emails(clase_id)

        await self.repo.update_fields(clase, {
            "disciplina": disciplina_obj.nombre,
            "dia_semana": data.dia_semana,
            "hora_inicio": data.hora_inicio,
            "hora_fin": data.hora_fin,
            "sala_id": data.sala_id,
            "profesor_id": data.profesor_id,
            "nombre": disciplina_obj.nombre.capitalize(),
            "capacidad_maxima": data.capacidad_maxima,
        })

        dia_label = data.dia_semana.value.capitalize()
        hora_inicio_str = data.hora_inicio.strftime("%H:%M")
        hora_fin_str = data.hora_fin.strftime("%H:%M")
        await EmailService().send_clase_update_notification(
            emails, disciplina_obj.nombre.capitalize(), dia_label, hora_inicio_str, hora_fin_str
        )

        clase = await self.repo.get_by_id(clase_id)
        precios = await self._load_precios()
        return self._to_response(clase, precios)

    async def list_all(self, skip: int = 0, limit: int = 100) -> list[ClaseTemplateResponse]:
        clases = await self.repo.get_all(skip, limit)
        precios = await self._load_precios()
        return [self._to_response(c, precios) for c in clases]

    async def get(self, clase_id: uuid.UUID) -> ClaseTemplateResponse:
        clase = await self.repo.get_by_id(clase_id)
        if not clase:
            raise NotFoundException("Clase no encontrada")
        precios = await self._load_precios()
        return self._to_response(clase, precios)

    async def get_semana(self, fecha: date, current_user: Usuario | None = None) -> list[ClaseSemanaResponse]:
        week_start = fecha - timedelta(days=(fecha.weekday() + 1) % 7)
        fechas = [week_start + timedelta(days=i) for i in range(7)]

        templates = await self.repo.get_all()
        suscripcion_service = SuscripcionService(self.db)
        for template in templates:
            await suscripcion_service.sync_template_subscriptions(template.id)

        subscription_dates_by_template: dict[uuid.UUID, list[date]] = {}
        subscription_dates: set[date] = set()
        for template in templates:
            fecha_inicio = week_start + timedelta(days=_DIA_OFFSET[template.dia_semana])
            fecha_fin = _calcular_fecha_fin(fecha_inicio)
            fechas_suscripcion = _calcular_fechas_clases(fecha_inicio, fecha_fin)
            subscription_dates_by_template[template.id] = fechas_suscripcion
            subscription_dates.update(fechas_suscripcion)

        all_relevant_dates = sorted(set(fechas) | subscription_dates)
        instancias = await ClaseInstanciaRepository(self.db).get_by_fechas(all_relevant_dates)
        precios = await self._load_precios()

        instancia_map = {(i.clase_template_id, i.fecha): i for i in instancias}
        week_instancias = [i for i in instancias if i.fecha in fechas]

        template_ids = [t.id for t in templates]
        subs_result = await self.db.execute(
            select(Suscripcion).where(
                Suscripcion.clase_template_id.in_(template_ids),
                Suscripcion.activo == True,
                Suscripcion.estado != EstadoSuscripcion.VENCIDA,
            )
        )
        subs = subs_result.scalars().all()

        # Count active subscriptions per template — used to compute cupo when no instancia exists yet
        active_subs_count: dict[uuid.UUID, int] = {}
        for s in subs:
            active_subs_count[s.clase_template_id] = active_subs_count.get(s.clase_template_id, 0) + 1

        instancia_ids = [i.id for i in instancias]
        asistencia_counts: dict[uuid.UUID, int] = {}
        waitlist_counts: dict[tuple[uuid.UUID, date], int] = {}
        if instancia_ids:
            asistencia_result = await self.db.execute(
                select(Asistencia.clase_instancia_id, func.count()).where(
                    Asistencia.clase_instancia_id.in_(instancia_ids),
                    Asistencia.cancelo == False,
                ).group_by(Asistencia.clase_instancia_id)
            )
            asistencia_counts = {row[0]: row[1] for row in asistencia_result.all()}

            waitlist_result = await self.db.execute(
                select(
                    WaitlistEntry.clase_template_id,
                    WaitlistEntry.fecha,
                    func.count(),
                ).where(
                    WaitlistEntry.activo == True,
                    WaitlistEntry.estado.in_((EstadoWaitlist.EN_ESPERA, EstadoWaitlist.NOTIFICADO)),
                    WaitlistEntry.fecha.in_(fechas),
                ).group_by(
                    WaitlistEntry.clase_template_id,
                    WaitlistEntry.fecha,
                )
            )
            waitlist_counts = {
                (row[0], row[1]): int(row[2])
                for row in waitlist_result.all()
            }

        def cupo_disponible_for(template, target_date: date) -> int:
            instancia = instancia_map.get((template.id, target_date))
            if instancia:
                return max(0, instancia.cupo)
            # IMPORTANT: when no instancia exists, cupo = capacidad_maxima minus ALL active
            # subscriptions for this template (date-independent), because subscriptions
            # pre-reserve slots regardless of whether the specific class instance is created yet.
            return max(0, template.capacidad_maxima - active_subs_count.get(template.id, 0))

        def cupo_suscripcion_disponible(template) -> bool:
            fechas_suscripcion = subscription_dates_by_template.get(template.id, [])
            return all(cupo_disponible_for(template, f) > 0 for f in fechas_suscripcion)

        # Enrollment status for current user
        inscrito_instancia_ids: set = set()
        user_subs: list = []
        if current_user:
            week_instancia_ids = [i.id for i in week_instancias]
            if week_instancia_ids:
                asistencias_result = await self.db.execute(
                    select(Asistencia.clase_instancia_id).where(
                        Asistencia.usuario_id == current_user.id,
                        Asistencia.tipo == TipoInscripcion.INDIVIDUAL,
                        Asistencia.cancelo == False,
                        Asistencia.clase_instancia_id.in_(week_instancia_ids),
                    )
                )
                inscrito_instancia_ids = {r[0] for r in asistencias_result.all()}

            user_subs_result = await self.db.execute(
                select(
                    Suscripcion.clase_template_id,
                    Suscripcion.fecha_inicio,
                    Suscripcion.fecha_fin,
                ).where(
                    Suscripcion.usuario_id == current_user.id,
                    Suscripcion.activo == True,
                    Suscripcion.estado != EstadoSuscripcion.VENCIDA,
                )
            )
            user_subs = user_subs_result.all()

        result = []
        for template in templates:
            offset = _DIA_OFFSET[template.dia_semana]
            fecha_clase = week_start + timedelta(days=offset)
            instancia = instancia_map.get((template.id, fecha_clase))
            cupo_disponible = cupo_disponible_for(template, fecha_clase)

            pi, ps = precios.get(template.disciplina.lower(), (0.0, 0.0))

            inscrito = instancia is not None and instancia.id in inscrito_instancia_ids
            suscrito = any(
                s.clase_template_id == template.id
                and s.fecha_inicio <= fecha_clase <= s.fecha_fin
                for s in user_subs
            )

            # Check if profesor has active license covering this date
            replacement_profesor_id = await self._get_replacement_profesor_for_date(
                template.profesor_id, fecha_clase
            )

            if replacement_profesor_id:
                # Use replacement profesor if license active for this date
                profesor_id_to_use = replacement_profesor_id
                # Fetch replacement profesor data for name
                from repositories.profesor_repository import ProfesorRepository
                profesor_to_use = await ProfesorRepository(self.db).get_by_id(replacement_profesor_id)
            else:
                # Use instance profesor override if exists, else template profesor
                profesor_id_to_use = instancia.profesor_id if (instancia and instancia.profesor_id) else template.profesor_id
                if instancia and instancia.profesor_id:
                    profesor_to_use = instancia.profesor
                else:
                    profesor_to_use = template.profesor

            result.append(ClaseSemanaResponse(
                id=template.id,
                nombre=template.nombre,
                descripcion=template.descripcion,
                disciplina=template.disciplina,
                dia_semana=template.dia_semana,
                hora_inicio=template.hora_inicio,
                hora_fin=template.hora_fin,
                capacidad_maxima=template.capacidad_maxima,
                precio_individual=pi,
                precio_suscripcion=ps,
                profesor_id=profesor_id_to_use,
                sala_id=template.sala_id,
                profesor_nombre=(
                    f"{profesor_to_use.nombre} {profesor_to_use.apellido}"
                    if profesor_to_use else None
                ),
                sala_nombre=template.sala.nombre if template.sala else None,
                fecha_en_semana=fecha_clase,
                cupo_disponible=cupo_disponible,
                cupo_suscripcion_disponible=cupo_suscripcion_disponible(template),
                    waitlist_disponible=True,
                    waitlist_total=waitlist_counts.get((template.id, fecha_clase), 0),
                instancia=InstanciaSemanaResponse(
                    id=instancia.id,
                    fecha=instancia.fecha,
                    cancelada=instancia.cancelada,
                    cupo=cupo_disponible,
                ) if instancia else None,
                inscrito=inscrito,
                suscrito=suscrito,
            ))

        return sorted(result, key=lambda x: (_DIA_OFFSET[x.dia_semana], x.hora_inicio))
