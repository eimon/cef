from models.usuario import Usuario
from models.asistencia import Asistencia
from models.suscripciones import Suscripcion
from schemas.usuario import UsuarioUpdate
from repositories.user_repository import UserRepository
from exceptions.general import NotFoundException, BadRequestException, ConflictException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)

    async def list(self, skip: int = 0, limit: int = 100) -> list[Usuario]:
        return await self.repo.get_all(skip, limit)

    async def get(self, usuario_id: uuid.UUID) -> Usuario:
        usuario = await self.repo.get_by_id(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        return usuario

    async def update(self, usuario_id: uuid.UUID, data: UsuarioUpdate) -> Usuario:
        usuario = await self.repo.update(usuario_id, data)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        return usuario

    async def delete(self, usuario_id: uuid.UUID, current_usuario_id: uuid.UUID) -> Usuario:
        if usuario_id == current_usuario_id:
            raise BadRequestException("No podés eliminar tu propio usuario")
        usuario = await self.repo.get_by_id(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        await self._validate_user_can_be_deleted(usuario.id)
        return await self.repo.delete(usuario_id)

    async def delete_by_dni(self, dni: str, current_usuario_id: uuid.UUID) -> Usuario:
        usuario = await self.repo.get_by_dni(dni)
        if not usuario:
            raise NotFoundException("No se encontró ningún usuario con ese DNI")
        if usuario.id == current_usuario_id:
            raise BadRequestException("No podés eliminar tu propio usuario")
        await self._validate_user_can_be_deleted(usuario.id)
        return await self.repo.delete(usuario.id)

    async def _validate_user_can_be_deleted(self, usuario_id: uuid.UUID) -> None:
        asistencia_count = await self.db.execute(
            select(func.count()).select_from(Asistencia).where(
                Asistencia.usuario_id == usuario_id,
                Asistencia.cancelo == False,
            )
        )
        if asistencia_count.scalar_one() > 0:
            raise ConflictException("El usuario tiene inscripciones a clases activas y no puede eliminarse")

        suscripcion_count = await self.db.execute(
            select(func.count()).select_from(Suscripcion).where(
                Suscripcion.usuario_id == usuario_id,
                Suscripcion.activo == True,
            )
        )
        if suscripcion_count.scalar_one() > 0:
            raise ConflictException("El usuario tiene suscripciones activas y no puede eliminarse")
