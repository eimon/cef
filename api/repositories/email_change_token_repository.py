import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from core.config import settings
from core.security import generate_refresh_token, hash_refresh_token
from models.email_change_token import EmailChangeToken


class EmailChangeTokenRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, usuario_id: uuid.UUID, new_email: str) -> tuple[EmailChangeToken, str]:
        raw_token, token_hash = generate_refresh_token()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)
        obj = EmailChangeToken(
            token_hash=token_hash,
            usuario_id=usuario_id,
            new_email=new_email,
            expires_at=expires_at,
        )
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj, raw_token

    async def get_by_raw_token(self, raw_token: str) -> EmailChangeToken | None:
        token_hash = hash_refresh_token(raw_token)
        result = await self.db.execute(
            select(EmailChangeToken).where(EmailChangeToken.token_hash == token_hash)
        )
        return result.scalars().first()

    async def mark_confirmed(self, token: EmailChangeToken) -> EmailChangeToken:
        if token.confirmed_at is None:
            token.confirmed_at = datetime.now(timezone.utc)
            await self.db.flush()
            await self.db.refresh(token)
        return token
