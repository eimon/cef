from datetime import date, timedelta

from repositories.clase_template_repository import ClaseTemplateRepository
from repositories.clase_instancia_repository import ClaseInstanciaRepository
from schemas.clase_template import ClaseTemplateResponse
from schemas.clase_semana import ClaseSemanaResponse, InstanciaSemanaResponse
from exceptions.general import NotFoundException
from core.enums import DiaSemana
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

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

    def _to_response(self, clase) -> ClaseTemplateResponse:
        return ClaseTemplateResponse(
            id=clase.id,
            nombre=clase.nombre,
            descripcion=clase.descripcion,
            disciplina=clase.disciplina,
            dia_semana=clase.dia_semana,
            hora_inicio=clase.hora_inicio,
            hora_fin=clase.hora_fin,
            capacidad_maxima=clase.capacidad_maxima,
            precio_individual=float(clase.precio_individual),
            precio_suscripcion=float(clase.precio_suscripcion),
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

    async def list_all(self, skip: int = 0, limit: int = 100) -> list[ClaseTemplateResponse]:
        clases = await self.repo.get_all(skip, limit)
        return [self._to_response(c) for c in clases]

    async def get(self, clase_id: uuid.UUID) -> ClaseTemplateResponse:
        clase = await self.repo.get_by_id(clase_id)
        if not clase:
            raise NotFoundException("Clase no encontrada")
        return self._to_response(clase)

    async def get_semana(self, fecha: date) -> list[ClaseSemanaResponse]:
        week_start = fecha - timedelta(days=fecha.weekday())
        fechas = [week_start + timedelta(days=i) for i in range(7)]

        templates = await self.repo.get_all()
        instancias = await ClaseInstanciaRepository(self.db).get_by_fechas(fechas)

        instancia_map = {(i.clase_template_id, i.fecha): i for i in instancias}

        result = []
        for template in templates:
            offset = _DIA_OFFSET[template.dia_semana]
            fecha_clase = week_start + timedelta(days=offset)
            instancia = instancia_map.get((template.id, fecha_clase))

            result.append(ClaseSemanaResponse(
                id=template.id,
                nombre=template.nombre,
                descripcion=template.descripcion,
                disciplina=template.disciplina,
                dia_semana=template.dia_semana,
                hora_inicio=template.hora_inicio,
                hora_fin=template.hora_fin,
                capacidad_maxima=template.capacidad_maxima,
                precio_individual=float(template.precio_individual),
                precio_suscripcion=float(template.precio_suscripcion),
                profesor_id=template.profesor_id,
                sala_id=template.sala_id,
                profesor_nombre=(
                    f"{template.profesor.nombre} {template.profesor.apellido}"
                    if template.profesor else None
                ),
                sala_nombre=template.sala.nombre if template.sala else None,
                fecha_en_semana=fecha_clase,
                instancia=InstanciaSemanaResponse(
                    id=instancia.id,
                    fecha=instancia.fecha,
                    cancelada=instancia.cancelada,
                ) if instancia else None,
            ))

        return sorted(result, key=lambda x: (_DIA_OFFSET[x.dia_semana], x.hora_inicio))
