from datetime import date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid

from repositories.clase_template_repository import ClaseTemplateRepository
from repositories.clase_instancia_repository import ClaseInstanciaRepository
from repositories.precio_disciplina_repository import PrecioDisciplinaRepository
from schemas.clase_template import ClaseTemplateCreate, ClaseTemplateUpdate, ClaseTemplateResponse
from schemas.clase_semana import ClaseSemanaResponse, InstanciaSemanaResponse
from exceptions.general import NotFoundException, SalaOcupadaException, ProfesorOcupadoException, ClaseConInscriptosException
from services.email_service import EmailService
from core.enums import DiaSemana, Disciplina
from models.clase_template import ClaseTemplate
from models.precio_disciplina import PrecioDisciplina
from models.suscripciones import Suscripcion

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
    DiaSemana.LUNES: 0,
    DiaSemana.MARTES: 1,
    DiaSemana.MIERCOLES: 2,
    DiaSemana.JUEVES: 3,
    DiaSemana.VIERNES: 4,
    DiaSemana.SABADO: 5,
    DiaSemana.DOMINGO: 6,
}


class ClaseTemplateService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ClaseTemplateRepository(db)

    async def _load_precios(self) -> dict[Disciplina, tuple[float, float]]:
        items = await PrecioDisciplinaRepository(self.db).get_all()
        return {p.disciplina: (float(p.precio_individual), float(p.precio_suscripcion)) for p in items}

    def _to_response(self, clase, precios: dict[Disciplina, tuple[float, float]]) -> ClaseTemplateResponse:
        pi, ps = precios.get(clase.disciplina, (0.0, 0.0))
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

    async def create(self, data: ClaseTemplateCreate) -> ClaseTemplateResponse:
        if await self.repo.get_conflicting_sala(data.sala_id, data.dia_semana, data.hora_inicio, data.hora_fin):
            raise SalaOcupadaException()

        if await self.repo.get_conflicting_profesor(data.profesor_id, data.dia_semana, data.hora_inicio, data.hora_fin):
            raise ProfesorOcupadoException()

        nombre = data.disciplina.value.capitalize()
        clase = ClaseTemplate(
            nombre=nombre,
            disciplina=data.disciplina,
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

        if await self.repo.get_conflicting_sala(data.sala_id, data.dia_semana, data.hora_inicio, data.hora_fin, exclude_id=clase_id):
            raise SalaOcupadaException()

        if await self.repo.get_conflicting_profesor(data.profesor_id, data.dia_semana, data.hora_inicio, data.hora_fin, exclude_id=clase_id):
            raise ProfesorOcupadoException()

        emails = await self.repo.get_enrolled_emails(clase_id)

        await self.repo.update_fields(clase, {
            "disciplina": data.disciplina,
            "dia_semana": data.dia_semana,
            "hora_inicio": data.hora_inicio,
            "hora_fin": data.hora_fin,
            "sala_id": data.sala_id,
            "profesor_id": data.profesor_id,
            "nombre": data.disciplina.value.capitalize(),
            "capacidad_maxima": data.capacidad_maxima,
        })

        dia_label = data.dia_semana.value.capitalize()
        hora_inicio_str = data.hora_inicio.strftime("%H:%M")
        hora_fin_str = data.hora_fin.strftime("%H:%M")
        await EmailService().send_clase_update_notification(
            emails, data.disciplina.value.capitalize(), dia_label, hora_inicio_str, hora_fin_str
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

    async def get_semana(self, fecha: date) -> list[ClaseSemanaResponse]:
        week_start = fecha - timedelta(days=fecha.weekday())
        fechas = [week_start + timedelta(days=i) for i in range(7)]

        templates = await self.repo.get_all()
        instancias = await ClaseInstanciaRepository(self.db).get_by_fechas(fechas)
        precios = await self._load_precios()

        instancia_map = {(i.clase_template_id, i.fecha): i for i in instancias}

        template_ids = [t.id for t in templates]
        subs_result = await self.db.execute(
            select(Suscripcion).where(
                Suscripcion.clase_template_id.in_(template_ids),
                Suscripcion.activo == True,
            )
        )
        subs = subs_result.scalars().all()

        def count_subs(template_id: uuid.UUID) -> int:
            return sum(1 for s in subs if s.clase_template_id == template_id)

        result = []
        for template in templates:
            offset = _DIA_OFFSET[template.dia_semana]
            fecha_clase = week_start + timedelta(days=offset)
            instancia = instancia_map.get((template.id, fecha_clase))

            if instancia:
                cupo_disponible = instancia.cupo
            else:
                cupo_disponible = template.capacidad_maxima - count_subs(template.id)

            pi, ps = precios.get(template.disciplina, (0.0, 0.0))

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
                profesor_id=template.profesor_id,
                sala_id=template.sala_id,
                profesor_nombre=(
                    f"{template.profesor.nombre} {template.profesor.apellido}"
                    if template.profesor else None
                ),
                sala_nombre=template.sala.nombre if template.sala else None,
                fecha_en_semana=fecha_clase,
                cupo_disponible=cupo_disponible,
                instancia=InstanciaSemanaResponse(
                    id=instancia.id,
                    fecha=instancia.fecha,
                    cancelada=instancia.cancelada,
                    cupo=instancia.cupo,
                ) if instancia else None,
            ))

        return sorted(result, key=lambda x: (_DIA_OFFSET[x.dia_semana], x.hora_inicio))
