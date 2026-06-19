import unicodedata
import uuid

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.usuario import Usuario
from models.asistencia import Asistencia
from models.suscripciones import Suscripcion
from schemas.usuario import UsuarioCreate, UsuarioUpdate, PublicSignupRequest
from core.enums import UserRole
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
        await self.db.delete(usuario)
        return usuario

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
