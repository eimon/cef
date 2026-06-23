import uuid
from datetime import date

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.enums import EstadoLicencia
from models.licencia import Licencia


class LicenciaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, licencia_id: uuid.UUID) -> Licencia | None:
        result = await self.db.execute(
            select(Licencia)
            .options(
                selectinload(Licencia.profesor),
                selectinload(Licencia.profesor_reemplazo),
            )
            .where(Licencia.id == licencia_id)
        )
        return result.scalars().first()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        profesor_id: uuid.UUID | None = None,
        estado: EstadoLicencia | None = None,
        fecha_desde: date | None = None,
        fecha_hasta: date | None = None,
    ) -> list[Licencia]:
        query = (
            select(Licencia)
            .options(
                selectinload(Licencia.profesor),
                selectinload(Licencia.profesor_reemplazo),
            )
            .where(Licencia.activo == True)
            .order_by(Licencia.created_at.desc())
        )

        if profesor_id:
            query = query.where(Licencia.profesor_id == profesor_id)
        if estado:
            query = query.where(Licencia.estado == estado)
        if fecha_desde:
            query = query.where(Licencia.fecha_fin >= fecha_desde)
        if fecha_hasta:
            query = query.where(Licencia.fecha_inicio <= fecha_hasta)

        result = await self.db.execute(query.offset(skip).limit(limit))
        return list(result.scalars().all())

    async def get_overlapping(
        self,
        profesor_id: uuid.UUID,
        fecha_inicio: date,
        fecha_fin: date,
        exclude_id: uuid.UUID | None = None,
    ) -> Licencia | None:
        query = select(Licencia).where(
            Licencia.profesor_id == profesor_id,
            Licencia.activo == True,
            Licencia.estado.in_([EstadoLicencia.PENDIENTE, EstadoLicencia.APROBADA]),
            and_(Licencia.fecha_inicio <= fecha_fin, Licencia.fecha_fin >= fecha_inicio),
        )
        if exclude_id:
            query = query.where(Licencia.id != exclude_id)

        result = await self.db.execute(query)
        return result.scalars().first()

    async def create(self, licencia: Licencia) -> Licencia:
        self.db.add(licencia)
        await self.db.flush()
        await self.db.refresh(licencia)
        return licencia

    async def update_fields(self, licencia: Licencia, fields: dict) -> Licencia:
        for key, value in fields.items():
            setattr(licencia, key, value)
        await self.db.flush()
        await self.db.refresh(licencia)
        return licencia

    async def soft_delete(self, licencia: Licencia) -> Licencia:
        licencia.activo = False
        await self.db.flush()
        await self.db.refresh(licencia)
        return licencia
