from models.usuario import Usuario
from schemas.usuario import UsuarioUpdate
from repositories.user_repository import UserRepository
from exceptions.general import NotFoundException, BadRequestException, ConflictException, ForbiddenException
from sqlalchemy.ext.asyncio import AsyncSession
import uuid


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)

    async def list(
        self,
        skip: int = 0,
        limit: int = 100,
        dni: str | None = None,
        nombre: str | None = None,
        apellido: str | None = None,
        current_user: Usuario | None = None,
    ) -> list[Usuario]:
        usuarios = await self.repo.get_all(skip, limit, dni, nombre, apellido)
        if (dni or nombre or apellido) and not usuarios:
            raise NotFoundException("No se encuentran usuarios")
        return usuarios

    async def get(self, usuario_id: uuid.UUID, current_user: Usuario | None = None) -> Usuario:
        usuario = await self.repo.get_by_id(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        return usuario

    async def update(self, usuario_id: uuid.UUID, data: UsuarioUpdate, current_user: Usuario | None = None) -> Usuario:
        usuario = await self.repo.update(usuario_id, data)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        return usuario

    async def delete(self, usuario_id: uuid.UUID, current_usuario_id: uuid.UUID, current_user: Usuario | None = None) -> Usuario:
        if usuario_id == current_usuario_id:
            raise BadRequestException("No podés eliminar tu propio usuario")

        if await self.repo.has_active_enrollment(usuario_id):
            raise ConflictException("No se puede eliminar el usuario porque está inscripto a una clase")

        usuario = await self.repo.delete(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        return usuario
