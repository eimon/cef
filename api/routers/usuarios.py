from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from schemas.usuario import UsuarioUpdate, UsuarioResponse
from services.user_service import UserService
from core.database import get_db
from dependencies.auth import has_role
from models.usuario import Usuario
from core.roles import Role

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[UsuarioResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_USER_LIST)),
):
    return await UserService(db).list(skip, limit)


@router.get("/{usuario_id}", response_model=UsuarioResponse)
async def get_user(
    usuario_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_USER_LIST)),
):
    return await UserService(db).get(usuario_id)


@router.delete("/dni/{dni}")
async def delete_user_by_dni(
    dni: str,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_USER_DELETE)),
):
    await UserService(db).delete_by_dni(dni, current_user.id)
    return {"detail": "Usuario eliminado con éxito"}


@router.put("/{usuario_id}", response_model=UsuarioResponse)
async def update_user(
    usuario_id: UUID,
    data: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_USER_UPDATE)),
):
    return await UserService(db).update(usuario_id, data)


@router.delete("/{usuario_id}", status_code=204)
async def delete_user(
    usuario_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_USER_DELETE)),
):
    await UserService(db).delete(usuario_id, current_user.id)
