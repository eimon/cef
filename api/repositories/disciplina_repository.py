import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from models.disciplina import Disciplina
from schemas.disciplina import DisciplinaCreate, DisciplinaUpdate


class DisciplinaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[Disciplina]:
        result = await self.db.execute(
            select(Disciplina)
            .where(Disciplina.activo == True)
            .order_by(Disciplina.nombre)
        )
        return list(result.scalars().all())

    async def get_by_id(self, id: uuid.UUID) -> Disciplina | None:
        result = await self.db.execute(
            select(Disciplina).where(Disciplina.id == id)
        )
        return result.scalars().first()

    async def get_by_nombre(self, nombre: str) -> Disciplina | None:
        result = await self.db.execute(
            select(Disciplina).where(func.lower(Disciplina.nombre) == nombre.lower())
        )
        return result.scalars().first()

    async def create(self, data: DisciplinaCreate) -> Disciplina:
        obj = Disciplina(**data.model_dump())
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def update(self, obj: Disciplina, data: DisciplinaUpdate) -> Disciplina:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(obj, key, value)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: Disciplina) -> Disciplina:
        obj.activo = False
        await self.db.flush()
        return obj
