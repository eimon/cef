import uuid
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.clase_instancia import ClaseInstancia


class ClaseInstanciaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_fechas(self, fechas: list[date]) -> list[ClaseInstancia]:
        if not fechas:
            return []
        result = await self.db.execute(
            select(ClaseInstancia).where(
                ClaseInstancia.fecha.in_(fechas),
                ClaseInstancia.activo == True,
            )
        )
        return list(result.scalars().all())

    async def get_by_template_and_fecha(
        self, template_id: uuid.UUID, fecha: date
    ) -> ClaseInstancia | None:
        result = await self.db.execute(
            select(ClaseInstancia).where(
                ClaseInstancia.clase_template_id == template_id,
                ClaseInstancia.fecha == fecha,
                ClaseInstancia.activo == True,
            )
        )
        return result.scalars().first()
