from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from schemas.usuario import UsuarioUpdate, UsuarioResponse
from services.user_service import UserService
from core.database import get_db
from dependencies.auth import has_role, get_current_user
from models.usuario import Usuario
from core.roles import Role

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[UsuarioResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    dni: str | None = Query(None, min_length=1),
    nombre: str | None = Query(None, min_length=1),
    apellido: str | None = Query(None, min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # Require permission based on user role
    if current_user.role.value == "admin":
        # Admin requires ROLE_USER_LIST
        if Role.ROLE_USER_LIST not in current_user.permissions:
            from exceptions.general import ForbiddenException
            raise ForbiddenException("No autorizado para esta acción")
    else:
        # Non-admin requires ROLE_CLIENT_LIST
        if Role.ROLE_CLIENT_LIST not in current_user.permissions:
            from exceptions.general import ForbiddenException
            raise ForbiddenException("No autorizado para esta acción")
    
    return await UserService(db).list(skip, limit, dni, nombre, apellido, current_user)


@router.get("/me", response_model=UsuarioResponse)
async def get_me(
    current_user: Usuario = Depends(get_current_user),
):
    return current_user


@router.get("/{usuario_id}", response_model=UsuarioResponse)
async def get_user(
    usuario_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # Same permission logic as list
    if current_user.role.value == "admin":
        if Role.ROLE_USER_LIST not in current_user.permissions:
            from exceptions.general import ForbiddenException
            raise ForbiddenException("No autorizado para esta acción")
    else:
        if Role.ROLE_CLIENT_LIST not in current_user.permissions:
            from exceptions.general import ForbiddenException
            raise ForbiddenException("No autorizado para esta acción")
    
    return await UserService(db).get(usuario_id, current_user)


@router.put("/{usuario_id}", response_model=UsuarioResponse)
async def update_user(
    usuario_id: UUID,
    data: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # Require permission based on user role
    if current_user.role.value == "admin":
        if Role.ROLE_USER_UPDATE not in current_user.permissions:
            from exceptions.general import ForbiddenException
            raise ForbiddenException("No autorizado para esta acción")
    else:
        if Role.ROLE_CLIENT_UPDATE not in current_user.permissions:
            from exceptions.general import ForbiddenException
            raise ForbiddenException("No autorizado para esta acción")
    
    return await UserService(db).update(usuario_id, data, current_user)


@router.delete("/{usuario_id}", status_code=204)
async def delete_user(
    usuario_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # Require permission based on user role
    if current_user.role.value == "admin":
        if Role.ROLE_USER_DELETE not in current_user.permissions:
            from exceptions.general import ForbiddenException
            raise ForbiddenException("No autorizado para esta acción")
    else:
        if Role.ROLE_CLIENT_DELETE not in current_user.permissions:
            from exceptions.general import ForbiddenException
            raise ForbiddenException("No autorizado para esta acción")
    
    await UserService(db).delete(usuario_id, current_user.id, current_user)
