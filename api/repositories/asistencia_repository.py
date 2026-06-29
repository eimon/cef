import uuid
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from models.asistencia import Asistencia
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate


class AsistenciaRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_instancia(self, instancia_id: uuid.UUID) -> list[Asistencia]:
        result = await self.db.execute(
            select(Asistencia)
            .options(selectinload(Asistencia.usuario))
            .where(Asistencia.clase_instancia_id == instancia_id)
        )
        return list(result.scalars().all())

    async def get_hoy_por_usuario(self, usuario_id: uuid.UUID) -> list[Asistencia]:
        today = date.today()
        result = await self.db.execute(
            select(Asistencia)
            .options(
                selectinload(Asistencia.clase_instancia).selectinload(ClaseInstancia.clase_template)
            )
            .join(ClaseInstancia, Asistencia.clase_instancia_id == ClaseInstancia.id)
            .where(
                Asistencia.usuario_id == usuario_id,
                ClaseInstancia.fecha == today,
                Asistencia.cancelo == False,
            )
        )
        return list(result.scalars().all())

    async def get_by_id_with_relations(self, asistencia_id: uuid.UUID) -> Asistencia | None:
        result = await self.db.execute(
            select(Asistencia)
            .options(
                selectinload(Asistencia.clase_instancia).selectinload(ClaseInstancia.clase_template)
            )
            .where(Asistencia.id == asistencia_id)
        )
        return result.scalars().first()

    async def get_instancias_hoy(self) -> list[ClaseInstancia]:
        today = date.today()
        result = await self.db.execute(
            select(ClaseInstancia)
            .options(
                selectinload(ClaseInstancia.clase_template).selectinload(ClaseTemplate.sala)
            )
            .join(ClaseTemplate, ClaseInstancia.clase_template_id == ClaseTemplate.id)
            .where(
                ClaseInstancia.fecha == today,
                ClaseInstancia.activo == True,
                ClaseInstancia.cancelada == False,
            )
            .order_by(ClaseTemplate.hora_inicio)
        )
        return list(result.scalars().all())

    async def get_by_instancia_y_usuario(
        self, instancia_id: uuid.UUID, usuario_id: uuid.UUID
    ) -> Asistencia | None:
        result = await self.db.execute(
            select(Asistencia)
            .options(
                selectinload(Asistencia.clase_instancia).selectinload(ClaseInstancia.clase_template)
            )
            .where(
                Asistencia.clase_instancia_id == instancia_id,
                Asistencia.usuario_id == usuario_id,
                Asistencia.cancelo == False,
            )
        )
        return result.scalars().first()

    async def marcar_presente(self, asistencia_id: uuid.UUID) -> Asistencia | None:
        result = await self.db.execute(
            select(Asistencia).where(Asistencia.id == asistencia_id)
        )
        asistencia = result.scalars().first()
        if not asistencia:
            return None
        asistencia.asistio = True
        await self.db.flush()
        await self.db.refresh(asistencia)
        return asistencia
