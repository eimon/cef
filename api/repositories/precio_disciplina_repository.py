from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.enums import Disciplina
from models.precio_disciplina import PrecioDisciplina


class PrecioDisciplinaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[PrecioDisciplina]:
        result = await self.db.execute(select(PrecioDisciplina))
        return list(result.scalars().all())

    async def get_by_disciplina(self, disciplina: Disciplina) -> PrecioDisciplina | None:
        result = await self.db.execute(
            select(PrecioDisciplina).where(PrecioDisciplina.disciplina == disciplina)
        )
        return result.scalars().first()

    async def upsert(
        self,
        disciplina: Disciplina,
        precio_individual: float,
        precio_suscripcion: float,
    ) -> PrecioDisciplina:
        obj = await self.get_by_disciplina(disciplina)
        if obj:
            obj.precio_individual = precio_individual
            obj.precio_suscripcion = precio_suscripcion
        else:
            obj = PrecioDisciplina(
                disciplina=disciplina,
                precio_individual=precio_individual,
                precio_suscripcion=precio_suscripcion,
            )
            self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj
