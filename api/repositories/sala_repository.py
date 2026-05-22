from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.sala import Sala


class SalaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[Sala]:
        result = await self.db.execute(
            select(Sala).where(Sala.activo == True).order_by(Sala.nombre)
        )
        return list(result.scalars().all())
