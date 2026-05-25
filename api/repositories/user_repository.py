from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.usuario import Usuario
from schemas.usuario import UsuarioCreate, UsuarioUpdate, PublicSignupRequest
from core.enums import UserRole
from core.security import get_password_hash
import uuid


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

    async def get_by_telefono(self, telefono: str) -> Usuario | None:
        result = await self.db.execute(select(Usuario).where(Usuario.telefono == telefono))
        return result.scalars().first()

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[Usuario]:
        result = await self.db.execute(
            select(Usuario).where(Usuario.activo == True).offset(skip).limit(limit)
        )
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
        await self.db.execute(delete(Usuario).where(Usuario.id == usuario_id))
        await self.db.flush()
        return usuario

    async def delete_by_dni(self, dni: str) -> Usuario | None:
        usuario = await self.get_by_dni(dni)
        if not usuario:
            return None
        await self.db.execute(delete(Usuario).where(Usuario.id == usuario.id))
        await self.db.flush()
        return usuario

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
