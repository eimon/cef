import unicodedata
import uuid
from datetime import date, time

from sqlalchemy import and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.usuario import Usuario
from models.asistencia import Asistencia
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.suscripciones import Suscripcion, SuscripcionReserva
from schemas.usuario import UsuarioCreate, UsuarioUpdate, PublicSignupRequest
from core.enums import TipoInscripcion, UserRole
from core.security import get_password_hash


def _normalize_text_search(value: str | None) -> str | None:
    if not value:
        return None

    value = value.strip()
    if not value:
        return None

    return "".join(
        char
        for char in unicodedata.normalize("NFKD", value)
        if not unicodedata.combining(char)
    )


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, usuario_id: uuid.UUID) -> Usuario | None:
        result = await self.db.execute(select(Usuario).where(Usuario.id == usuario_id))
        return result.scalars().first()

    async def get_by_email(self, email: str) -> Usuario | None:
        result = await self.db.execute(select(Usuario).where(Usuario.email == email))
        return result.scalars().first()

    async def get_by_dni(self, dni: str) -> Usuario | None:
        result = await self.db.execute(select(Usuario).where(Usuario.dni == dni))
        return result.scalars().first()

    async def get_all_clientes(self) -> list[Usuario]:
        result = await self.db.execute(
            select(Usuario).where(
                Usuario.activo == True,
                Usuario.role == UserRole.CLIENTE,
            )
        )
        return list(result.scalars().all())

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        dni: str | None = None,
        nombre: str | None = None,
        apellido: str | None = None,
    ) -> list[Usuario]:
        query = select(Usuario)

        dni = dni.strip() if dni else None
        nombre = _normalize_text_search(nombre)
        apellido = _normalize_text_search(apellido)

        if dni:
            query = query.where(Usuario.dni.ilike(f"%{dni}%"))
        if nombre:
            query = query.where(func.unaccent(Usuario.nombre).ilike(f"%{nombre}%"))
        if apellido:
            query = query.where(func.unaccent(Usuario.apellido).ilike(f"%{apellido}%"))

        query = query.order_by(Usuario.activo.desc(), Usuario.created_at.desc())

        result = await self.db.execute(query.offset(skip).limit(limit))
        return list(result.scalars().all())

    async def update(self, usuario_id: uuid.UUID, data: UsuarioUpdate) -> Usuario | None:
        usuario = await self.get_by_id(usuario_id)
        if not usuario:
            return None
        update_fields = data.model_dump(exclude_unset=True)
        if 'password' in update_fields:
            usuario.hashed_password = get_password_hash(update_fields.pop('password'))
        for key, value in update_fields.items():
            setattr(usuario, key, value)
        await self.db.flush()
        await self.db.refresh(usuario)
        return usuario

    async def delete(self, usuario_id: uuid.UUID) -> Usuario | None:
        usuario = await self.get_by_id(usuario_id)
        if not usuario:
            return None
        usuario.activo = False
        await self.db.flush()
        await self.db.refresh(usuario)
        return usuario

    async def cancel_pending_class_reservations(
        self,
        usuario_id: uuid.UUID,
        current_date: date,
        current_time: time,
    ) -> list[tuple[uuid.UUID, date]]:
        released_slots: set[tuple[uuid.UUID, date]] = set()
        pending_class = or_(
            ClaseInstancia.fecha > current_date,
            and_(
                ClaseInstancia.fecha == current_date,
                ClaseTemplate.hora_inicio > current_time,
            ),
        )

        reservation_rows = (
            await self.db.execute(
                select(SuscripcionReserva, ClaseInstancia)
                .join(Suscripcion, SuscripcionReserva.suscripcion_id == Suscripcion.id)
                .join(ClaseInstancia, SuscripcionReserva.clase_instancia_id == ClaseInstancia.id)
                .join(ClaseTemplate, ClaseInstancia.clase_template_id == ClaseTemplate.id)
                .where(
                    Suscripcion.usuario_id == usuario_id,
                    SuscripcionReserva.activa == True,
                    ClaseInstancia.activo == True,
                    ClaseInstancia.cancelada == False,
                    pending_class,
                )
            )
        ).all()

        reservation_instance_ids = [reserva.clase_instancia_id for reserva, _ in reservation_rows]
        for reserva, instancia in reservation_rows:
            reserva.activa = False
            instancia.cupo += 1
            released_slots.add((instancia.clase_template_id, instancia.fecha))

        if reservation_instance_ids:
            subscription_assistances = (
                await self.db.execute(
                    select(Asistencia).where(
                        Asistencia.usuario_id == usuario_id,
                        Asistencia.clase_instancia_id.in_(reservation_instance_ids),
                        Asistencia.tipo == TipoInscripcion.SUSCRIPCION,
                        Asistencia.asistio == False,
                        Asistencia.cancelo == False,
                    )
                )
            ).scalars().all()
            for asistencia in subscription_assistances:
                asistencia.cancelo = True

        individual_rows = (
            await self.db.execute(
                select(Asistencia, ClaseInstancia)
                .join(ClaseInstancia, Asistencia.clase_instancia_id == ClaseInstancia.id)
                .join(ClaseTemplate, ClaseInstancia.clase_template_id == ClaseTemplate.id)
                .where(
                    Asistencia.usuario_id == usuario_id,
                    Asistencia.tipo == TipoInscripcion.INDIVIDUAL,
                    Asistencia.asistio == False,
                    Asistencia.cancelo == False,
                    ClaseInstancia.activo == True,
                    ClaseInstancia.cancelada == False,
                    pending_class,
                )
            )
        ).all()

        for asistencia, instancia in individual_rows:
            asistencia.cancelo = True
            instancia.cupo += 1
            released_slots.add((instancia.clase_template_id, instancia.fecha))

        active_subscriptions = (
            await self.db.execute(
                select(Suscripcion).where(
                    Suscripcion.usuario_id == usuario_id,
                    Suscripcion.activo == True,
                )
            )
        ).scalars().all()
        for suscripcion in active_subscriptions:
            suscripcion.activo = False

        await self.db.flush()
        return list(released_slots)

    async def has_active_enrollment(self, usuario_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(Asistencia)
            .where(Asistencia.usuario_id == usuario_id, Asistencia.cancelo == False)
            .limit(1)
        )
        if result.scalars().first():
            return True

        result = await self.db.execute(
            select(Suscripcion)
            .where(Suscripcion.usuario_id == usuario_id, Suscripcion.activo == True)
            .limit(1)
        )
        return result.scalars().first() is not None

    async def create(self, data: UsuarioCreate, hashed_password: str) -> Usuario:
        usuario = Usuario(
            email=data.email,
            telefono=data.telefono,
            nombre=data.nombre,
            apellido=data.apellido,
            fecha_nacimiento=data.fecha_nacimiento,
            dni=data.dni,
            genero=data.genero,
            hashed_password=hashed_password,
            role=data.role,
        )
        self.db.add(usuario)
        await self.db.flush()
        await self.db.refresh(usuario)
        return usuario

    async def create_public_signup(self, data: PublicSignupRequest, hashed_password: str) -> Usuario:
        usuario = Usuario(
            email=data.email,
            telefono=data.telefono,
            nombre=data.nombre,
            apellido=data.apellido,
            fecha_nacimiento=data.fecha_nacimiento,
            dni=data.dni,
            genero=data.genero,
            hashed_password=hashed_password,
            role=UserRole.CLIENTE,
            activo=False,
        )
        self.db.add(usuario)
        await self.db.flush()
        await self.db.refresh(usuario)
        return usuario
