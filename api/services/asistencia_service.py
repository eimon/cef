import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.asistencia_repository import AsistenciaRepository
from repositories.user_repository import UserRepository
from schemas.asistencia import (
    AsistenciaRecepcionResponse,
    AsistenciaEscaneoItem,
    EscaneoQRResponse,
)
from exceptions.general import NotFoundException


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

    async def get_hoy_por_dni(self, dni: str) -> EscaneoQRResponse:
        usuario = await UserRepository(self.db).get_by_dni(dni)
        if not usuario:
            raise NotFoundException("No se encontró ningún cliente con ese DNI")

        asistencias = await self.repo.get_hoy_por_usuario(usuario.id)
        nombre = f"{usuario.nombre or ''} {usuario.apellido or ''}".strip() or usuario.email

        items = [
            AsistenciaEscaneoItem(
                asistencia_id=a.id,
                clase_nombre=a.clase_instancia.clase_template.nombre,
                disciplina=a.clase_instancia.clase_template.disciplina,
                hora_inicio=str(a.clase_instancia.clase_template.hora_inicio)[:5],
                hora_fin=str(a.clase_instancia.clase_template.hora_fin)[:5],
                tipo=a.tipo,
                asistio=a.asistio,
                cancelo=a.cancelo,
            )
            for a in asistencias
        ]

        return EscaneoQRResponse(usuario_nombre=nombre, asistencias=items)

    async def marcar_presente(self, asistencia_id: uuid.UUID) -> None:
        asistencia = await self.repo.marcar_presente(asistencia_id)
        if not asistencia:
            raise NotFoundException("Asistencia no encontrada")
