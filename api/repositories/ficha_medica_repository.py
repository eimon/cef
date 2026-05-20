from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.ficha_medica import FichaMedica
from schemas.ficha_medica import FichaMedicaCreate
import uuid


class FichaMedicaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_usuario_id(self, usuario_id: uuid.UUID) -> FichaMedica | None:
        result = await self.db.execute(
            select(FichaMedica).where(FichaMedica.usuario_id == usuario_id)
        )
        return result.scalars().first()

    async def create(self, data: FichaMedicaCreate) -> FichaMedica:
        obj = FichaMedica(**data.model_dump())
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj
