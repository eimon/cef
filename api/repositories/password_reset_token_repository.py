import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.config import settings
from core.security import generate_refresh_token, hash_refresh_token
from models.password_reset_token import PasswordResetToken


class PasswordResetTokenRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, usuario_id: uuid.UUID) -> tuple[PasswordResetToken, str]:
        raw_token, token_hash = generate_refresh_token()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=getattr(settings, "PASSWORD_RESET_TOKEN_EXPIRE_HOURS", settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS))
        obj = PasswordResetToken(
            token_hash=token_hash,
            usuario_id=usuario_id,
            expires_at=expires_at,
        )
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj, raw_token

    async def get_by_raw_token(self, raw_token: str) -> PasswordResetToken | None:
        token_hash = hash_refresh_token(raw_token)
        result = await self.db.execute(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )
        return result.scalars().first()

    async def mark_used(self, token: PasswordResetToken) -> PasswordResetToken:
        if token.used_at is None:
            token.used_at = datetime.now(timezone.utc)
            await self.db.flush()
            await self.db.refresh(token)
        return token
