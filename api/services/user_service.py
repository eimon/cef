from models.usuario import Usuario
from repositories.inscripcion_repository import InscripcionRepository
from repositories.suscripcion_repository import SuscripcionRepository
from repositories.user_repository import UserRepository
from schemas.usuario import UsuarioUpdate
from exceptions.general import NotFoundException, BadRequestException, ConflictException
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
        if data.dni:
            existing = await self.repo.get_by_dni(data.dni)
            if existing and existing.id != usuario_id:
                raise ConflictException("DNI ya registrado")
        if data.telefono:
            existing = await self.repo.get_by_telefono(data.telefono)
            if existing and existing.id != usuario_id:
                raise ConflictException("Telefono ya registrado")

        usuario = await self.repo.update(usuario_id, data)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        return usuario

    async def delete(self, usuario_id: uuid.UUID, current_usuario_id: uuid.UUID) -> Usuario:
        if usuario_id == current_usuario_id:
            raise BadRequestException("No podés eliminar tu propio usuario")

        if await InscripcionRepository(self.db).has_active_inscripciones(usuario_id):
            raise ConflictException("No se puede eliminar al usuario porque está inscripto a una clase.")

        if await SuscripcionRepository(self.db).has_active_suscripciones(usuario_id):
            raise ConflictException("No se puede eliminar al usuario porque tiene suscripciones activas.")

        usuario = await self.repo.delete(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        return usuario

    async def delete_by_dni(self, dni: str, current_usuario_id: uuid.UUID) -> Usuario:
        usuario = await self.repo.get_by_dni(dni)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        if usuario.id == current_usuario_id:
            raise BadRequestException("No podés eliminar tu propio usuario")

        if await InscripcionRepository(self.db).has_active_inscripciones(usuario.id):
            raise ConflictException("No se puede eliminar al usuario porque está inscripto a una clase.")

        if await SuscripcionRepository(self.db).has_active_suscripciones(usuario.id):
            raise ConflictException("No se puede eliminar al usuario porque tiene suscripciones activas.")

        usuario = await self.repo.delete_by_dni(dni)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        return usuario
