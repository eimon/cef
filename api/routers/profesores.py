from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from schemas.profesor import ProfesorCreate, ProfesorUpdate, ProfesorResponse, ProfesorEstadoUpdate
from services.profesor_service import ProfesorService
from core.database import get_db
from dependencies.auth import has_role
from models.usuario import Usuario
from core.roles import Role

router = APIRouter(prefix="/profesores", tags=["profesores"])


@router.get("/", response_model=List[ProfesorResponse])
async def list_profesores(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    dni: Optional[str] = Query(None),
    nombre: Optional[str] = Query(None),
    apellido: Optional[str] = Query(None),
    incluir_inactivos: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_PROFESOR_LIST)),
):
    return await ProfesorService(db).list(skip, limit, dni, nombre, apellido, incluir_inactivos)


@router.get("/{profesor_id}", response_model=ProfesorResponse)
async def get_profesor(
    profesor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_PROFESOR_LIST)),
):
    return await ProfesorService(db).get(profesor_id)


@router.post("/", response_model=ProfesorResponse, status_code=201)
async def create_profesor(
    data: ProfesorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_PROFESOR_CREATE)),
):
    return await ProfesorService(db).create(data)


@router.post("/{profesor_id}/reactivar", response_model=ProfesorResponse)
async def reactivate_profesor(
    profesor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_PROFESOR_CREATE)),
):
    return await ProfesorService(db).reactivate(profesor_id)


@router.put("/{profesor_id}", response_model=ProfesorResponse)
async def update_profesor(
    profesor_id: UUID,
    data: ProfesorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_PROFESOR_UPDATE)),
):
    return await ProfesorService(db).update(profesor_id, data)


@router.delete("/{profesor_id}", status_code=204)
async def delete_profesor(
    profesor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_PROFESOR_DELETE)),
):
    await ProfesorService(db).delete(profesor_id)


@router.patch("/{profesor_id}/estado", response_model=ProfesorResponse)
async def set_estado_profesor(
    profesor_id: UUID,
    data: ProfesorEstadoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_PROFESOR_UPDATE)),
):
    return await ProfesorService(db).set_disponibilidad(profesor_id, data.disponible, data.motivo)
