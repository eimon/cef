from sqlalchemy.ext.asyncio import AsyncSession

from repositories.disciplina_repository import DisciplinaRepository
from schemas.disciplina import DisciplinaUpdate
from schemas.precio_disciplina import PrecioDisciplinaUpdate, PrecioDisciplinaResponse
from exceptions.general import NotFoundException


class PrecioDisciplinaService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DisciplinaRepository(db)

    async def get_all(self) -> list[PrecioDisciplinaResponse]:
        items = await self.repo.get_all()
        return [
            PrecioDisciplinaResponse(
                disciplina=i.nombre,
                precio_individual=float(i.precio_individual),
                precio_suscripcion=float(i.precio_suscripcion),
                updated_at=i.updated_at or i.created_at,
            )
            for i in items
        ]

    async def update(self, disciplina: str, data: PrecioDisciplinaUpdate) -> PrecioDisciplinaResponse:
        obj = await self.repo.get_by_nombre(disciplina)
        if not obj:
            raise NotFoundException(f"No hay precio configurado para {disciplina}")
        updated = await self.repo.update(obj, DisciplinaUpdate(
            precio_individual=data.precio_individual,
            precio_suscripcion=data.precio_suscripcion,
        ))
        return PrecioDisciplinaResponse(
            disciplina=updated.nombre,
            precio_individual=float(updated.precio_individual),
            precio_suscripcion=float(updated.precio_suscripcion),
            updated_at=updated.updated_at or updated.created_at,
        )
