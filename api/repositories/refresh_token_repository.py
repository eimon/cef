import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update

from core.config import settings
from core.security import generate_refresh_token
from models.refresh_token import RefreshToken


class RefreshTokenRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_id: uuid.UUID, device_hint: str | None = None) -> tuple[RefreshToken, str]:
        """Creates a new refresh token. Returns (orm_obj, raw_token_string).
        The raw token is only available at creation time — store it securely."""
        raw_token, token_hash = generate_refresh_token()
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        obj = RefreshToken(
            token_hash=token_hash,
            user_id=user_id,
            expires_at=expires_at,
            device_hint=device_hint,
        )
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj, raw_token

    async def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        return result.scalars().first()

    async def revoke(self, token: RefreshToken) -> RefreshToken:
        """Marks token as revoked. Idempotent: safe to call on already-revoked tokens."""
        if token.revoked_at is None:
            token.revoked_at = datetime.now(timezone.utc)
            await self.db.flush()
            await self.db.refresh(token)
        return token

    async def replace(self, old_token: RefreshToken, new_token_id: uuid.UUID) -> RefreshToken:
        """Marks old_token as rotated: sets replaced_by and revoked_at."""
        old_token.replaced_by = new_token_id
        old_token.revoked_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(old_token)
        return old_token

    async def revoke_all_for_user(self, user_id: uuid.UUID) -> None:
        """Revokes all active tokens for the user. Used on replay attack detection."""
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.now(timezone.utc))
        )
        await self.db.flush()
