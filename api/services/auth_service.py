import uuid
from models.usuario import Usuario
from schemas.usuario import UsuarioCreate, Token
from repositories.user_repository import UserRepository
from core.security import verify_password, get_password_hash
from exceptions.general import ConflictException, UnauthorizedException, BadRequestException
from services.refresh_token_service import RefreshTokenService
from sqlalchemy.ext.asyncio import AsyncSession


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register_user(self, data: UsuarioCreate) -> Usuario:
        if await self.user_repo.get_by_email(data.email):
            raise ConflictException("Email ya registrado")
        hashed_password = get_password_hash(data.password)
        return await self.user_repo.create(data, hashed_password)

    async def authenticate_user(
        self, email: str, password: str, device_hint: str | None = None
    ) -> Token:
        usuario = await self.user_repo.get_by_email(email)
        if not usuario or not usuario.hashed_password:
            raise UnauthorizedException("Email o contraseña incorrectos")
        if not verify_password(password, usuario.hashed_password):
            raise UnauthorizedException("Email o contraseña incorrectos")
        role = usuario.role.value if hasattr(usuario.role, "value") else usuario.role
        return await RefreshTokenService(self.db).create_token_pair(
            usuario_id=usuario.id,
            role=role,
            device_hint=device_hint,
        )

    async def change_password(
        self, usuario_id: uuid.UUID, current_password: str, new_password: str
    ) -> Usuario:
        usuario = await self.user_repo.get_by_id(usuario_id)
        if not usuario:
            raise UnauthorizedException("Usuario no encontrado")
        if not verify_password(current_password, usuario.hashed_password):
            raise BadRequestException("Contraseña actual incorrecta")
        usuario.hashed_password = get_password_hash(new_password)
        await self.db.flush()
        await self.db.refresh(usuario)
        return usuario
