import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from core.security import create_access_token, hash_refresh_token
from exceptions.general import UnauthorizedException
from repositories.refresh_token_repository import RefreshTokenRepository
from repositories.user_repository import UserRepository
from schemas.usuario import Token


class RefreshTokenService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = RefreshTokenRepository(db)

    async def create_token_pair(
        self, usuario_id: uuid.UUID, role: str, device_hint: str | None = None
    ) -> Token:
        token_obj, raw_refresh = await self.repo.create(usuario_id, device_hint)
        access_token = create_access_token(subject=str(usuario_id), claims={"role": role})
        return Token(
            access_token=access_token,
            refresh_token=raw_refresh,
            token_type="bearer",
        )

    async def rotate(self, raw_refresh_token: str, device_hint: str | None = None) -> Token:
        """Valida un refresh token y retorna un nuevo par.

        Detección de replay attack: si se usa un token ya rotado,
        se revocan todos los tokens activos del usuario.
        """
        token_hash = hash_refresh_token(raw_refresh_token)
        token = await self.repo.get_by_hash(token_hash)

        if token is None:
            raise UnauthorizedException("Token inválido")

        if token.revoked_at is not None and token.replaced_by is not None:
            await self.repo.revoke_all_for_user(token.usuario_id)
            raise UnauthorizedException("Sesión comprometida. Iniciá sesión nuevamente.")

        if token.revoked_at is not None:
            raise UnauthorizedException("Token revocado")

        if token.expires_at < datetime.now(timezone.utc):
            raise UnauthorizedException("Sesión expirada")

        user_repo = UserRepository(self.db)
        usuario = await user_repo.get_by_id(token.usuario_id)
        if usuario is None or not usuario.activo:
            raise UnauthorizedException("Usuario no disponible")

        new_token_obj, raw_new_refresh = await self.repo.create(token.usuario_id, device_hint)
        access_token = create_access_token(
            subject=str(token.usuario_id),
            claims={"role": usuario.role.value if hasattr(usuario.role, "value") else usuario.role},
        )
        await self.repo.replace(token, new_token_obj.id)

        return Token(
            access_token=access_token,
            refresh_token=raw_new_refresh,
            token_type="bearer",
        )

    async def revoke(self, raw_refresh_token: str) -> None:
        token_hash = hash_refresh_token(raw_refresh_token)
        token = await self.repo.get_by_hash(token_hash)
        if token is not None:
            await self.repo.revoke(token)
