from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from core.config import settings
from core.database import get_db
from core.roles import role_hierarchy
from repositories.user_repository import UserRepository
from models.user import User as Usuario
from exceptions.general import UnauthorizedException, ForbiddenException

oauth2_bearer = OAuth2PasswordBearer(tokenUrl='auth/login')

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_bearer),
) -> Usuario:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise UnauthorizedException("Token inválido")
    except JWTError:
        raise UnauthorizedException("Token inválido")

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise UnauthorizedException("ID de usuario inválido en token")

    repo = UserRepository(db)
    user = await repo.get_by_id(user_uuid)

    if user is None:
        raise UnauthorizedException("Usuario no encontrado")

    # Populate permissions from Role enum value
    role_key = user.role.value.upper()
    user.permissions = role_hierarchy.get(role_key, [])
    
    return user


def has_role(required_permission: str):
    async def role_dependency(user: Usuario = Depends(get_current_user)):
        if required_permission not in user.permissions:
            raise ForbiddenException("No autorizado para esta acción")
        return user
    return role_dependency