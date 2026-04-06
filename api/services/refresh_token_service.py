import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from core.security import create_access_token, hash_refresh_token
from exceptions.general import UnauthorizedException
from repositories.refresh_token_repository import RefreshTokenRepository
from repositories.user_repository import UserRepository
from schemas.user import Token


class RefreshTokenService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = RefreshTokenRepository(db)

    async def create_token_pair(
        self, user_id: uuid.UUID, role: str, device_hint: str | None = None
    ) -> Token:
        """Generates a new access + refresh token pair for the given user."""
        token_obj, raw_refresh = await self.repo.create(user_id, device_hint)
        access_token = create_access_token(subject=str(user_id), claims={"role": role})
        return Token(
            access_token=access_token,
            refresh_token=raw_refresh,
            token_type="bearer",
        )

    async def rotate(self, raw_refresh_token: str, device_hint: str | None = None) -> Token:
        """Validates a refresh token and returns a new token pair.

        Replay attack detection: if a previously rotated token is used,
        all active tokens for the user are revoked immediately.
        """
        token_hash = hash_refresh_token(raw_refresh_token)
        token = await self.repo.get_by_hash(token_hash)

        if token is None:
            raise UnauthorizedException("Token inválido")

        if token.revoked_at is not None and token.replaced_by is not None:
            # Token was already rotated — this is a replay attack
            await self.repo.revoke_all_for_user(token.user_id)
            raise UnauthorizedException("Sesión comprometida. Iniciá sesión nuevamente.")

        if token.revoked_at is not None:
            # Token was manually revoked (logout)
            raise UnauthorizedException("Token revocado")

        if token.expires_at < datetime.now(timezone.utc):
            raise UnauthorizedException("Sesión expirada")

        # Validate user is still active
        user_repo = UserRepository(self.db)
        user = await user_repo.get_by_id(token.user_id)
        if user is None or not user.is_active:
            raise UnauthorizedException("Usuario no disponible")

        # Create new token pair
        new_token_obj, raw_new_refresh = await self.repo.create(token.user_id, device_hint)
        access_token = create_access_token(
            subject=str(token.user_id),
            claims={"role": user.role.value if hasattr(user.role, "value") else user.role},
        )

        # Mark old token as rotated
        await self.repo.replace(token, new_token_obj.id)

        return Token(
            access_token=access_token,
            refresh_token=raw_new_refresh,
            token_type="bearer",
        )

    async def revoke(self, raw_refresh_token: str) -> None:
        """Revokes a refresh token. Idempotent: no error if already revoked or not found."""
        token_hash = hash_refresh_token(raw_refresh_token)
        token = await self.repo.get_by_hash(token_hash)
        if token is not None:
            await self.repo.revoke(token)
