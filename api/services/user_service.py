from models.usuario import Usuario
from schemas.usuario import UsuarioUpdate
from repositories.user_repository import UserRepository
from exceptions.general import NotFoundException, BadRequestException, ConflictException, ForbiddenException
from sqlalchemy.ext.asyncio import AsyncSession
from core.enums import UserRole
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
        if current_user and self._role_value(current_user.role) != UserRole.ADMIN.value:
            usuarios = [
                usuario
                for usuario in usuarios
                if self._role_value(usuario.role) == UserRole.CLIENTE.value
            ]
        if (dni or nombre or apellido) and not usuarios:
            raise NotFoundException("No se encuentran usuarios")
        return usuarios

    async def get(self, usuario_id: uuid.UUID, current_user: Usuario | None = None) -> Usuario:
        usuario = await self.repo.get_by_id(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        if current_user and self._role_value(current_user.role) != UserRole.ADMIN.value:
            if self._role_value(usuario.role) != UserRole.CLIENTE.value:
                raise ForbiddenException("No autorizado para esta accion")
        return usuario

    async def update(self, usuario_id: uuid.UUID, data: UsuarioUpdate, current_user: Usuario | None = None) -> Usuario:
        usuario = await self.repo.get_by_id(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")

        if current_user and self._role_value(current_user.role) != UserRole.ADMIN.value:
            if self._role_value(usuario.role) != UserRole.CLIENTE.value:
                raise ForbiddenException("No autorizado para esta accion")
            if data.role and data.role != UserRole.CLIENTE:
                raise ForbiddenException("Solo puede editar usuarios con rol cliente")

        if data.email:
            existing = await self.repo.get_by_email(data.email)
            if existing and existing.id != usuario_id:
                raise ConflictException("Email ya registrado")

        if data.dni:
            existing = await self.repo.get_by_dni(data.dni)
            if existing and existing.id != usuario_id:
                raise ConflictException("DNI ya registrado")

        updated = await self.repo.update(usuario_id, data)
        if not updated:
            raise NotFoundException("Usuario no encontrado")
        return updated

    async def delete(self, usuario_id: uuid.UUID, current_usuario_id: uuid.UUID, current_user: Usuario | None = None) -> Usuario:
        if usuario_id == current_usuario_id:
            raise BadRequestException("No podés eliminar tu propio usuario")

        usuario = await self.repo.get_by_id(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")

        if current_user and self._role_value(current_user.role) != UserRole.ADMIN.value:
            if self._role_value(usuario.role) != UserRole.CLIENTE.value:
                raise ForbiddenException("No autorizado para esta accion")

        if await self.repo.has_active_enrollment(usuario_id):
            raise ConflictException("No se puede eliminar el usuario porque está inscripto a una clase")

        usuario = await self.repo.delete(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        return usuario

    @staticmethod
    def _role_value(role: str | UserRole) -> str:
        return role.value if hasattr(role, "value") else str(role)
