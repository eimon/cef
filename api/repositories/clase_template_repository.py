from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import uuid

from models.clase_template import ClaseTemplate


class ClaseTemplateRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, clase_id: uuid.UUID) -> ClaseTemplate | None:
        result = await self.db.execute(
            select(ClaseTemplate)
            .options(selectinload(ClaseTemplate.profesor), selectinload(ClaseTemplate.sala))
            .where(ClaseTemplate.id == clase_id)
        )
        return result.scalars().first()

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[ClaseTemplate]:
        result = await self.db.execute(
            select(ClaseTemplate)
            .options(selectinload(ClaseTemplate.profesor), selectinload(ClaseTemplate.sala))
            .where(ClaseTemplate.activo == True)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())
