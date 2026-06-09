import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.disciplina_repository import DisciplinaRepository
from schemas.disciplina import DisciplinaCreate, DisciplinaUpdate, DisciplinaResponse
from exceptions.general import NotFoundException, ConflictException


class DisciplinaService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DisciplinaRepository(db)

    async def list_all(self) -> list[DisciplinaResponse]:
        items = await self.repo.get_all()
        return [DisciplinaResponse.model_validate(i) for i in items]

    async def create(self, data: DisciplinaCreate) -> DisciplinaResponse:
        existing = await self.repo.get_by_nombre(data.nombre)
        if existing:
            raise ConflictException("Ya existe una disciplina con ese nombre")
        obj = await self.repo.create(data)
        return DisciplinaResponse.model_validate(obj)

    async def update(self, id: uuid.UUID, data: DisciplinaUpdate) -> DisciplinaResponse:
        obj = await self.repo.get_by_id(id)
        if not obj:
            raise NotFoundException("Disciplina no encontrada")
        if data.nombre is not None:
            existing = await self.repo.get_by_nombre(data.nombre)
            if existing and existing.id != obj.id:
                raise ConflictException("Ya existe una disciplina con ese nombre")
        updated = await self.repo.update(obj, data)
        return DisciplinaResponse.model_validate(updated)

    async def delete(self, id: uuid.UUID) -> None:
        obj = await self.repo.get_by_id(id)
        if not obj:
            raise NotFoundException("Disciplina no encontrada")
        await self.repo.delete(obj)
