from models.user import User
from schemas.user import UserUpdate
from repositories.user_repository import UserRepository
from exceptions.general import NotFoundException, BadRequestException
from sqlalchemy.ext.asyncio import AsyncSession
import uuid


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)

    async def list(self, skip: int = 0, limit: int = 100) -> list[User]:
        return await self.repo.get_all(skip, limit)

    async def get(self, user_id: uuid.UUID) -> User:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("Usuario no encontrado")
        return user

    async def update(self, user_id: uuid.UUID, data: UserUpdate) -> User:
        user = await self.repo.update(user_id, data)
        if not user:
            raise NotFoundException("Usuario no encontrado")
        return user

    async def delete(self, user_id: uuid.UUID, current_user_id: uuid.UUID) -> User:
        if user_id == current_user_id:
            raise BadRequestException("No puedes eliminar tu propio usuario")
        user = await self.repo.delete(user_id)
        if not user:
            raise NotFoundException("Usuario no encontrado")
        return user
