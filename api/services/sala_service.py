import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from exceptions.general import NotFoundException
from repositories.sala_repository import SalaRepository
from schemas.sala import SalaCreate, SalaResponse, SalaUpdate


class SalaService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SalaRepository(db)

    async def list_all(self) -> list[SalaResponse]:
        salas = await self.repo.get_all()
        return [SalaResponse.model_validate(s) for s in salas]

    async def get(self, sala_id: uuid.UUID) -> SalaResponse:
        sala = await self.repo.get_by_id(sala_id)
        if not sala:
            raise NotFoundException("Sala no encontrada")
        return SalaResponse.model_validate(sala)

    async def create(self, data: SalaCreate) -> SalaResponse:
        sala = await self.repo.create(data)
        return SalaResponse.model_validate(sala)

    async def update(self, sala_id: uuid.UUID, data: SalaUpdate) -> SalaResponse:
        sala = await self.repo.update(sala_id, data)
        if not sala:
            raise NotFoundException("Sala no encontrada")
        return SalaResponse.model_validate(sala)

    async def delete(self, sala_id: uuid.UUID) -> None:
        sala = await self.repo.delete(sala_id)
        if not sala:
            raise NotFoundException("Sala no encontrada")
