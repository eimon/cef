import uuid
from models.user import User
from schemas.user import UserCreate, Token
from repositories.user_repository import UserRepository
from core.security import verify_password, get_password_hash
from exceptions.general import ConflictException, UnauthorizedException, BadRequestException
from services.refresh_token_service import RefreshTokenService
from sqlalchemy.ext.asyncio import AsyncSession


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register_user(self, user_create: UserCreate) -> User:
        """Register a new user. Business logic and validations go here."""
        if await self.user_repo.get_by_email(user_create.email):
            raise ConflictException("Email ya registrado")

        hashed_password = get_password_hash(user_create.password)
        return await self.user_repo.create(user_create, hashed_password)

    async def authenticate_user(
        self, username: str, password: str, device_hint: str | None = None
    ) -> Token:
        """Authenticate user and return access + refresh token pair."""
        user = await self.user_repo.get_by_username(username)

        if not user or not user.hashed_password:
            raise UnauthorizedException("Usuario o contraseña incorrectos")

        if not verify_password(password, user.hashed_password):
            raise UnauthorizedException("Usuario o contraseña incorrectos")

        role = user.role.value if hasattr(user.role, "value") else user.role
        return await RefreshTokenService(self.db).create_token_pair(
            user_id=user.id,
            role=role,
            device_hint=device_hint,
        )

    async def change_password(
        self, user_id: uuid.UUID, current_password: str, new_password: str
    ) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise UnauthorizedException("Usuario no encontrado")
        if not verify_password(current_password, user.hashed_password):
            raise BadRequestException("Contraseña actual incorrecta")
        user.hashed_password = get_password_hash(new_password)
        await self.db.flush()
        await self.db.refresh(user)
        return user
