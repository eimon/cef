from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid

from models.profesor import Profesor
from models.clase_template import ClaseTemplate
from schemas.profesor import ProfesorCreate, ProfesorUpdate
from repositories.profesor_repository import ProfesorRepository
from repositories.licencia_repository import LicenciaRepository
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
        self.licencia_repo = LicenciaRepository(db)

    async def _sync_disponibilidad_desde_licencias(self) -> None:
        today = date.today()
        changed = False

        for licencia in await self.licencia_repo.get_vigentes_hoy(today):
            profesor = licencia.profesor
            if profesor.licencia_activa_id is None:
                profesor.disponible = False
                profesor.licencia_activa_id = licencia.id
                changed = True

        for profesor in await self.repo.get_con_licencia_vencida(today):
            profesor.disponible = True
            profesor.licencia_activa_id = None
            changed = True

        if changed:
            await self.db.flush()

    async def list(
        self,
        skip: int = 0,
        limit: int = 100,
        dni: str | None = None,
        nombre: str | None = None,
        apellido: str | None = None,
        incluir_inactivos: bool = False,
    ) -> list[Profesor]:
        await self._sync_disponibilidad_desde_licencias()
        return await self.repo.get_all(skip, limit, dni, nombre, apellido, incluir_inactivos)

    async def get(self, profesor_id: uuid.UUID) -> Profesor:
        await self._sync_disponibilidad_desde_licencias()
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
                    raise BadRequestException(
                        "No es posible quitar la disciplina porque el profesor tiene clases activas asignadas"
                    )

        updated = await self.repo.update(profesor_id, data)
        if not updated:
            raise NotFoundException("Profesor no encontrado")
        return updated

    async def _tiene_clases_futuras(self, profesor_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(ClaseTemplate).where(
                ClaseTemplate.profesor_id == profesor_id,
                ClaseTemplate.activo == True,
            )
        )
        return result.scalars().first() is not None

    async def delete(self, profesor_id: uuid.UUID) -> Profesor:
        profesor = await self.repo.get_by_id(profesor_id)
        if not profesor:
            raise NotFoundException("Profesor no encontrado")
        if not profesor.activo:
            raise BadRequestException("El profesor ya se encuentra dado de baja")
        if await self._tiene_clases_futuras(profesor_id):
            raise BadRequestException(
                "No es posible eliminar al profesor porque tiene clases futuras asignadas. "
                "Reasigne las clases antes de continuar"
            )
        return await self.repo.soft_delete(profesor_id)

    async def set_disponibilidad(
        self, profesor_id: uuid.UUID, disponible: bool, motivo: str | None = None
    ) -> Profesor:
        profesor = await self.repo.get_by_id(profesor_id)
        if not profesor:
            raise NotFoundException("Profesor no encontrado")
        if not profesor.activo:
            raise BadRequestException("El profesor no se encuentra activo")

        if disponible and profesor.licencia_activa_id is not None:
            # El admin fuerza la reactivación antes de que termine la licencia:
            # esa licencia ya no debe volver a desactivarlo automáticamente.
            await self.licencia_repo.mark_disponibilidad_anulada(profesor.licencia_activa_id)

        if not disponible:
            motivo = (motivo or "").strip() or None
            if not motivo:
                raise BadRequestException("Debés indicar un motivo para marcar al profesor como inactivo")
            if await self._tiene_clases_futuras(profesor_id):
                raise BadRequestException(
                    "No es posible marcar como inactivo al profesor porque tiene clases futuras asignadas. "
                    "Reasigne las clases antes de continuar"
                )

        updated = await self.repo.set_disponibilidad(profesor_id, disponible, motivo)
        if not updated:
            raise NotFoundException("Profesor no encontrado")
        return updated
