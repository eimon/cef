import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from models.asistencia import Asistencia


class AsistenciaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_instancia(self, instancia_id: uuid.UUID) -> list[Asistencia]:
        result = await self.db.execute(
            select(Asistencia)
            .options(selectinload(Asistencia.usuario))
            .where(Asistencia.clase_instancia_id == instancia_id)
        )
        return list(result.scalars().all())
