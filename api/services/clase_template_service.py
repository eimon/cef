from repositories.clase_template_repository import ClaseTemplateRepository
from schemas.clase_template import ClaseTemplateResponse
from exceptions.general import NotFoundException
from sqlalchemy.ext.asyncio import AsyncSession
import uuid


class ClaseTemplateService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ClaseTemplateRepository(db)

    def _to_response(self, clase) -> ClaseTemplateResponse:
        return ClaseTemplateResponse(
            id=clase.id,
            nombre=clase.nombre,
            descripcion=clase.descripcion,
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

    async def list(self, skip: int = 0, limit: int = 100) -> list[ClaseTemplateResponse]:
        clases = await self.repo.get_all(skip, limit)
        return [self._to_response(c) for c in clases]

    async def get(self, clase_id: uuid.UUID) -> ClaseTemplateResponse:
        clase = await self.repo.get_by_id(clase_id)
        if not clase:
            raise NotFoundException("Clase no encontrada")
        return self._to_response(clase)
