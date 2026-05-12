from models.usuario import Usuario
from schemas.usuario import UsuarioUpdate
from repositories.user_repository import UserRepository
from exceptions.general import NotFoundException, BadRequestException
from sqlalchemy.ext.asyncio import AsyncSession
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
        usuario = await self.repo.delete(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        return usuario
