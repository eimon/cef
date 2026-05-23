import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.asistencia_repository import AsistenciaRepository
from schemas.asistencia import AsistenciaRecepcionResponse


class AsistenciaService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AsistenciaRepository(db)

    async def get_for_instancia(self, instancia_id: uuid.UUID) -> list[AsistenciaRecepcionResponse]:
        asistencias = await self.repo.get_by_instancia(instancia_id)
        return [
            AsistenciaRecepcionResponse(
                asistencia_id=a.id,
                usuario_nombre=f"{a.usuario.nombre or ''} {a.usuario.apellido or ''}".strip(),
                tipo=a.tipo,
                asistio=a.asistio,
                cancelo=a.cancelo,
            )
            for a in asistencias
        ]
