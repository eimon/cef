from datetime import date, time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import uuid

from models.clase_template import ClaseTemplate
from models.clase_instancia import ClaseInstancia
from models.asistencia import Asistencia
from models.suscripciones import Suscripcion
from models.usuario import Usuario
from models.historial_precio import HistorialPrecio
from core.enums import DiaSemana


class ClaseTemplateRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_conflicting_sala(
        self,
        sala_id: uuid.UUID,
        dia_semana: DiaSemana,
        hora_inicio: time,
        hora_fin: time,
        exclude_id: uuid.UUID | None = None,
    ) -> ClaseTemplate | None:
        q = select(ClaseTemplate).where(
            ClaseTemplate.sala_id == sala_id,
            ClaseTemplate.dia_semana == dia_semana,
            ClaseTemplate.activo == True,
            ClaseTemplate.hora_inicio < hora_fin,
            ClaseTemplate.hora_fin > hora_inicio,
        )
        if exclude_id:
            q = q.where(ClaseTemplate.id != exclude_id)
        return (await self.db.execute(q)).scalars().first()

    async def get_conflicting_profesor(
        self,
        profesor_id: uuid.UUID,
        dia_semana: DiaSemana,
        hora_inicio: time,
        hora_fin: time,
        exclude_id: uuid.UUID | None = None,
    ) -> ClaseTemplate | None:
        q = select(ClaseTemplate).where(
            ClaseTemplate.profesor_id == profesor_id,
            ClaseTemplate.dia_semana == dia_semana,
            ClaseTemplate.activo == True,
            ClaseTemplate.hora_inicio < hora_fin,
            ClaseTemplate.hora_fin > hora_inicio,
        )
        if exclude_id:
            q = q.where(ClaseTemplate.id != exclude_id)
        return (await self.db.execute(q)).scalars().first()

    async def create(self, clase: ClaseTemplate) -> ClaseTemplate:
        self.db.add(clase)
        await self.db.commit()
        await self.db.refresh(clase)
        return clase

    async def update_fields(self, clase: ClaseTemplate, fields: dict) -> ClaseTemplate:
        for key, value in fields.items():
            setattr(clase, key, value)
        await self.db.commit()
        await self.db.refresh(clase)
        return clase

    async def has_inscriptos(self, template_id: uuid.UUID) -> bool:
        today = date.today()

        sub = (await self.db.execute(
            select(Suscripcion.id).where(
                Suscripcion.clase_template_id == template_id,
                Suscripcion.activo == True,
            ).limit(1)
        )).scalars().first()
        if sub:
            return True

        asis = (await self.db.execute(
            select(Asistencia.id)
            .join(ClaseInstancia, ClaseInstancia.id == Asistencia.clase_instancia_id)
            .where(
                ClaseInstancia.clase_template_id == template_id,
                ClaseInstancia.fecha >= today,
                Asistencia.cancelo == False,
            ).limit(1)
        )).scalars().first()
        return asis is not None

    async def soft_delete(self, clase: ClaseTemplate) -> None:
        clase.activo = False
        await self.db.commit()

    async def get_enrolled_emails(self, template_id: uuid.UUID) -> list[str]:
        today = date.today()

        sub_q = (
            select(Usuario.email)
            .join(Suscripcion, Suscripcion.usuario_id == Usuario.id)
            .where(
                Suscripcion.clase_template_id == template_id,
                Suscripcion.activo == True,
                Usuario.email.isnot(None),
            )
        )
        asis_q = (
            select(Usuario.email)
            .join(Asistencia, Asistencia.usuario_id == Usuario.id)
            .join(ClaseInstancia, ClaseInstancia.id == Asistencia.clase_instancia_id)
            .where(
                ClaseInstancia.clase_template_id == template_id,
                ClaseInstancia.fecha >= today,
                Asistencia.cancelo == False,
                Usuario.email.isnot(None),
            )
        )

        emails_sub = (await self.db.execute(sub_q)).scalars().all()
        emails_asis = (await self.db.execute(asis_q)).scalars().all()
        return list(set(list(emails_sub) + list(emails_asis)))

    async def get_by_id(self, clase_id: uuid.UUID) -> ClaseTemplate | None:
        result = await self.db.execute(
            select(ClaseTemplate)
            .options(selectinload(ClaseTemplate.profesor), selectinload(ClaseTemplate.sala))
            .where(ClaseTemplate.id == clase_id)
        )
        return result.scalars().first()

    async def update_precio(
        self,
        clase: ClaseTemplate,
        tipo: str,
        precio_anterior: float,
        precio_nuevo: float,
    ) -> None:
        if tipo == "mensualidad":
            clase.precio_suscripcion = precio_nuevo
        else:
            clase.precio_individual = precio_nuevo

        historial = HistorialPrecio(
            clase_template_id=clase.id,
            tipo=tipo,
            precio_anterior=precio_anterior,
            precio_nuevo=precio_nuevo,
        )
        self.db.add(historial)
        await self.db.commit()

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[ClaseTemplate]:
        result = await self.db.execute(
            select(ClaseTemplate)
            .options(selectinload(ClaseTemplate.profesor), selectinload(ClaseTemplate.sala))
            .where(ClaseTemplate.activo == True)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())
