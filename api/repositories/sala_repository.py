import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.sala import Sala
from schemas.sala import SalaCreate, SalaUpdate


class SalaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[Sala]:
        result = await self.db.execute(
            select(Sala).where(Sala.activo == True).order_by(Sala.nombre)
        )
        return list(result.scalars().all())

    async def get_by_id(self, sala_id: uuid.UUID) -> Sala | None:
        result = await self.db.execute(
            select(Sala).where(Sala.id == sala_id, Sala.activo == True)
        )
        return result.scalars().first()

    async def create(self, data: SalaCreate) -> Sala:
        sala = Sala(**data.model_dump())
        self.db.add(sala)
        await self.db.flush()
        await self.db.refresh(sala)
        return sala

    async def update(self, sala_id: uuid.UUID, data: SalaUpdate) -> Sala | None:
        sala = await self.get_by_id(sala_id)
        if not sala:
            return None
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(sala, key, value)
        await self.db.flush()
        await self.db.refresh(sala)
        return sala

    async def delete(self, sala_id: uuid.UUID) -> Sala | None:
        sala = await self.get_by_id(sala_id)
        if not sala:
            return None
        sala.activo = False
        return sala
