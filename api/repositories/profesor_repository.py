from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from models.profesor import Profesor
from models.disciplina import Disciplina
from schemas.profesor import ProfesorCreate, ProfesorUpdate
import uuid


class ProfesorRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, profesor_id: uuid.UUID) -> Profesor | None:
        result = await self.db.execute(
            select(Profesor)
            .options(selectinload(Profesor.disciplinas))
            .where(Profesor.id == profesor_id)
        )
        return result.scalars().first()

    async def get_by_dni(self, dni: str) -> Profesor | None:
        result = await self.db.execute(
            select(Profesor)
            .options(selectinload(Profesor.disciplinas))
            .where(Profesor.dni == dni)
        )
        return result.scalars().first()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        dni: str | None = None,
        nombre: str | None = None,
        apellido: str | None = None,
    ) -> list[Profesor]:
        query = (
            select(Profesor)
            .options(selectinload(Profesor.disciplinas))
            .where(Profesor.activo == True)
        )
        if dni:
            query = query.where(Profesor.dni.ilike(f"%{dni}%"))
        if nombre:
            query = query.where(Profesor.nombre.ilike(f"%{nombre}%"))
        if apellido:
            query = query.where(Profesor.apellido.ilike(f"%{apellido}%"))
        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _get_disciplinas_by_nombres(self, nombres: list[str]) -> list[Disciplina]:
        if not nombres:
            return []
        result = await self.db.execute(
            select(Disciplina).where(
                Disciplina.nombre.in_(nombres),
                Disciplina.activo == True,
            )
        )
        return list(result.scalars().all())

    async def create(self, data: ProfesorCreate) -> Profesor:
        disciplinas_nombres = data.disciplinas
        create_data = data.model_dump(exclude={"disciplinas"})
        profesor = Profesor(**create_data)

        if disciplinas_nombres:
            disciplinas = await self._get_disciplinas_by_nombres(disciplinas_nombres)
            profesor.disciplinas = disciplinas

        self.db.add(profesor)
        await self.db.flush()
        return await self.get_by_id(profesor.id)

    async def update(self, profesor_id: uuid.UUID, data: ProfesorUpdate) -> Profesor | None:
        profesor = await self.get_by_id(profesor_id)
        if not profesor:
            return None

        for key, value in data.model_dump(exclude_unset=True, exclude={"disciplinas"}).items():
            setattr(profesor, key, value)

        if "disciplinas" in data.model_fields_set:
            disciplinas = await self._get_disciplinas_by_nombres(data.disciplinas or [])
            profesor.disciplinas = disciplinas

        await self.db.flush()
        return await self.get_by_id(profesor_id)

    async def soft_delete(self, profesor_id: uuid.UUID) -> Profesor | None:
        profesor = await self.get_by_id(profesor_id)
        if not profesor:
            return None
        profesor.activo = False
        await self.db.flush()
        return await self.get_by_id(profesor_id)

    async def reactivate(self, profesor_id: uuid.UUID) -> Profesor | None:
        result = await self.db.execute(
            select(Profesor)
            .options(selectinload(Profesor.disciplinas))
            .where(Profesor.id == profesor_id)
        )
        profesor = result.scalars().first()
        if not profesor:
            return None
        profesor.activo = True
        await self.db.flush()
        return await self.get_by_id(profesor_id)
