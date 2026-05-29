from sqlalchemy.ext.asyncio import AsyncSession

from core.enums import Disciplina
from repositories.precio_disciplina_repository import PrecioDisciplinaRepository
from schemas.precio_disciplina import PrecioDisciplinaUpdate, PrecioDisciplinaResponse
from exceptions.general import NotFoundException


class PrecioDisciplinaService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PrecioDisciplinaRepository(db)

    async def get_all(self) -> list[PrecioDisciplinaResponse]:
        items = await self.repo.get_all()
        return [PrecioDisciplinaResponse.model_validate(i) for i in items]

    async def get_by_disciplina(self, disciplina: Disciplina) -> PrecioDisciplinaResponse:
        obj = await self.repo.get_by_disciplina(disciplina)
        if not obj:
            raise NotFoundException(f"No hay precio configurado para {disciplina.value}")
        return PrecioDisciplinaResponse.model_validate(obj)

    async def update(self, disciplina: Disciplina, data: PrecioDisciplinaUpdate) -> PrecioDisciplinaResponse:
        obj = await self.repo.upsert(disciplina, data.precio_individual, data.precio_suscripcion)
        return PrecioDisciplinaResponse.model_validate(obj)
