from sqlalchemy.ext.asyncio import AsyncSession

from repositories.sala_repository import SalaRepository
from schemas.sala import SalaResponse


class SalaService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SalaRepository(db)

    async def list_all(self) -> list[SalaResponse]:
        salas = await self.repo.get_all()
        return [SalaResponse.model_validate(s) for s in salas]
