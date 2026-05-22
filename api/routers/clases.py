from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from schemas.clase_template import ClaseTemplateCreate, ClaseTemplateUpdate, ClaseTemplateResponse
from schemas.clase_semana import ClaseSemanaResponse
from services.clase_template_service import ClaseTemplateService
from core.database import get_db
from dependencies.auth import get_current_user, has_role
from core.roles import Role
from models.usuario import Usuario

router = APIRouter(prefix="/clases", tags=["clases"])


@router.post("/", response_model=ClaseTemplateResponse, status_code=201)
async def create_clase(
    data: ClaseTemplateCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(has_role(Role.ROLE_CLASE_CREATE)),
):
    return await ClaseTemplateService(db).create(data)


@router.put("/{clase_id}", response_model=ClaseTemplateResponse)
async def update_clase(
    clase_id: UUID,
    data: ClaseTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(has_role(Role.ROLE_CLASE_UPDATE)),
):
    return await ClaseTemplateService(db).update(clase_id, data)


@router.delete("/{clase_id}", status_code=204)
async def delete_clase(
    clase_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(has_role(Role.ROLE_CLASE_DELETE)),
):
    await ClaseTemplateService(db).delete(clase_id)


@router.get("/semana", response_model=List[ClaseSemanaResponse])
async def get_clases_semana(
    fecha: date = Query(..., description="Cualquier fecha dentro de la semana (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await ClaseTemplateService(db).get_semana(fecha)


@router.get("/", response_model=List[ClaseTemplateResponse])
async def list_clases(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await ClaseTemplateService(db).list_all(skip, limit)


@router.get("/{clase_id}", response_model=ClaseTemplateResponse)
async def get_clase(
    clase_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await ClaseTemplateService(db).get(clase_id)
