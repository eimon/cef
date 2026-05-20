import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.config import settings
from core.security import generate_refresh_token, hash_refresh_token
from models.registration_token import RegistrationToken


class RegistrationTokenRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, usuario_id: uuid.UUID) -> tuple[RegistrationToken, str]:
        raw_token, token_hash = generate_refresh_token()
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
        )
        obj = RegistrationToken(
            token_hash=token_hash,
            usuario_id=usuario_id,
            expires_at=expires_at,
        )
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj, raw_token

    async def get_by_raw_token(self, raw_token: str) -> RegistrationToken | None:
        token_hash = hash_refresh_token(raw_token)
        result = await self.db.execute(
            select(RegistrationToken).where(RegistrationToken.token_hash == token_hash)
        )
        return result.scalars().first()

    async def mark_email_verified(self, token: RegistrationToken) -> RegistrationToken:
        if token.email_verified_at is None:
            token.email_verified_at = datetime.now(timezone.utc)
            await self.db.flush()
            await self.db.refresh(token)
        return token

    async def mark_completed(self, token: RegistrationToken) -> RegistrationToken:
        token.completed_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(token)
        return token
