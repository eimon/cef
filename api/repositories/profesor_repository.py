from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.profesor import Profesor
from schemas.profesor import ProfesorCreate, ProfesorUpdate
import uuid


class ProfesorRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, profesor_id: uuid.UUID) -> Profesor | None:
        result = await self.db.execute(select(Profesor).where(Profesor.id == profesor_id))
        return result.scalars().first()

    async def get_by_dni(self, dni: str) -> Profesor | None:
        result = await self.db.execute(select(Profesor).where(Profesor.dni == dni))
        return result.scalars().first()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        dni: str | None = None,
        nombre: str | None = None,
        apellido: str | None = None,
    ) -> list[Profesor]:
        query = select(Profesor).where(Profesor.activo == True)
        if dni:
            query = query.where(Profesor.dni.ilike(f"%{dni}%"))
        if nombre:
            query = query.where(Profesor.nombre.ilike(f"%{nombre}%"))
        if apellido:
            query = query.where(Profesor.apellido.ilike(f"%{apellido}%"))
        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, data: ProfesorCreate) -> Profesor:
        profesor = Profesor(**data.model_dump())
        self.db.add(profesor)
        await self.db.flush()
        await self.db.refresh(profesor)
        return profesor

    async def update(self, profesor_id: uuid.UUID, data: ProfesorUpdate) -> Profesor | None:
        profesor = await self.get_by_id(profesor_id)
        if not profesor:
            return None
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(profesor, key, value)
        await self.db.flush()
        await self.db.refresh(profesor)
        return profesor

    async def soft_delete(self, profesor_id: uuid.UUID) -> Profesor | None:
        profesor = await self.get_by_id(profesor_id)
        if not profesor:
            return None
        profesor.activo = False
        await self.db.flush()
        await self.db.refresh(profesor)
        return profesor

    async def reactivate(self, profesor_id: uuid.UUID) -> Profesor | None:
        result = await self.db.execute(select(Profesor).where(Profesor.id == profesor_id))
        profesor = result.scalars().first()
        if not profesor:
            return None
        profesor.activo = True
        await self.db.flush()
        await self.db.refresh(profesor)
        return profesor
