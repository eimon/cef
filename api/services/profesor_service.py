from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid

from models.profesor import Profesor
from models.clase_template import ClaseTemplate
from schemas.profesor import ProfesorCreate, ProfesorUpdate
from repositories.profesor_repository import ProfesorRepository
from exceptions.general import (
    NotFoundException,
    BadRequestException,
    ConflictException,
    ProfesorReactivableException,
)


class ProfesorService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ProfesorRepository(db)

    async def list(
        self,
        skip: int = 0,
        limit: int = 100,
        dni: str | None = None,
        nombre: str | None = None,
        apellido: str | None = None,
    ) -> list[Profesor]:
        return await self.repo.get_all(skip, limit, dni, nombre, apellido)

    async def get(self, profesor_id: uuid.UUID) -> Profesor:
        profesor = await self.repo.get_by_id(profesor_id)
        if not profesor:
            raise NotFoundException("Profesor no encontrado")
        return profesor

    async def create(self, data: ProfesorCreate) -> Profesor:
        existing = await self.repo.get_by_dni(data.dni)
        if existing:
            if existing.activo:
                raise ConflictException("El DNI ya se encuentra registrado en la plataforma")
            raise ProfesorReactivableException(
                profesor_id=str(existing.id),
                nombre=existing.nombre,
                apellido=existing.apellido,
                genero=existing.genero or "",
            )
        return await self.repo.create(data)

    async def reactivate(self, profesor_id: uuid.UUID) -> Profesor:
        profesor = await self.repo.reactivate(profesor_id)
        if not profesor:
            raise NotFoundException("Profesor no encontrado")
        return profesor

    async def update(self, profesor_id: uuid.UUID, data: ProfesorUpdate) -> Profesor:
        profesor = await self.repo.get_by_id(profesor_id)
        if not profesor:
            raise NotFoundException("Profesor no encontrado")
        if not profesor.activo:
            raise BadRequestException("Solo se pueden editar profesores activos")
        if data.dni and data.dni != profesor.dni:
            existing = await self.repo.get_by_dni(data.dni)
            if existing and existing.id != profesor_id:
                raise ConflictException("El DNI ingresado ya se encuentra registrado en otro profesor")

        if "disciplinas" in data.model_fields_set and data.disciplinas is not None:
            current = {d.nombre for d in profesor.disciplinas}
            removed = current - set(data.disciplinas)
            if removed:
                result = await self.db.execute(
                    select(ClaseTemplate).where(
                        ClaseTemplate.profesor_id == profesor_id,
                        ClaseTemplate.activo == True,
                        ClaseTemplate.disciplina.in_(removed),
                    )
                )
                conflicting = list(result.scalars().all())
                if conflicting:
                    nombres = ", ".join(sorted({c.disciplina for c in conflicting}))
                    raise BadRequestException(
                        f"No es posible quitar la disciplina porque el profesor tiene clases activas asignadas: {nombres}"
                    )

        updated = await self.repo.update(profesor_id, data)
        if not updated:
            raise NotFoundException("Profesor no encontrado")
        return updated

    async def delete(self, profesor_id: uuid.UUID) -> Profesor:
        profesor = await self.repo.get_by_id(profesor_id)
        if not profesor:
            raise NotFoundException("Profesor no encontrado")
        if not profesor.activo:
            raise BadRequestException("El profesor ya se encuentra dado de baja")
        result = await self.db.execute(
            select(ClaseTemplate).where(
                ClaseTemplate.profesor_id == profesor_id,
                ClaseTemplate.activo == True,
            )
        )
        if result.scalars().first():
            raise BadRequestException(
                "No es posible eliminar al profesor porque tiene clases futuras asignadas. "
                "Reasigne las clases antes de continuar"
            )
        return await self.repo.soft_delete(profesor_id)
