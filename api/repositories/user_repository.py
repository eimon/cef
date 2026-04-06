from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.user import User
from schemas.user import UserCreate, UserUpdate
from core.enums import UserRole
from core.security import get_password_hash
import uuid

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalars().first()
    
    async def get_by_username(self, username: str) -> User | None:
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalars().first()

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[User]:
        result = await self.db.execute(
            select(User).where(User.is_active == True).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def update(self, user_id: uuid.UUID, data: UserUpdate) -> User | None:
        user = await self.get_by_id(user_id)
        if not user:
            return None
        update_fields = data.model_dump(exclude_unset=True)
        if 'password' in update_fields:
            user.hashed_password = get_password_hash(update_fields.pop('password'))
        for key, value in update_fields.items():
            setattr(user, key, value)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def delete(self, user_id: uuid.UUID) -> User | None:
        user = await self.get_by_id(user_id)
        if not user:
            return None
        await self.db.delete(user)
        return user

    async def create(self, user_create: UserCreate, hashed_password: str) -> User:
        db_user = User(
            username=user_create.username,
            email=user_create.email,
            phone=user_create.phone,
            hashed_password=hashed_password,
            full_name=user_create.full_name,
            role=user_create.role
        )
        self.db.add(db_user)
        await self.db.flush()  # Flush to get DB-generated values
        await self.db.refresh(db_user)  # Refresh to load defaults
        return db_user
