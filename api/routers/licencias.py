from datetime import date
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.enums import EstadoLicencia
from core.roles import Role
from dependencies.auth import has_role
from models.usuario import Usuario
from schemas.licencia import (
    LicenciaCreate,
    LicenciaDecisionRequest,
    LicenciaResponse,
    LicenciaUpdate,
)
from services.licencia_service import LicenciaService

router = APIRouter(prefix="/licencias", tags=["licencias"])


@router.get("/", response_model=List[LicenciaResponse])
async def list_licencias(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    profesor_id: UUID | None = Query(None),
    estado: EstadoLicencia | None = Query(None),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_LICENCIA_LIST)),
):
    return await LicenciaService(db).list(
        skip=skip,
        limit=limit,
        profesor_id=profesor_id,
        estado=estado,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )


@router.get("/{licencia_id}", response_model=LicenciaResponse)
async def get_licencia(
    licencia_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_LICENCIA_LIST)),
):
    return await LicenciaService(db).get(licencia_id)


@router.post("/", response_model=LicenciaResponse, status_code=201)
async def create_licencia(
    data: LicenciaCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_LICENCIA_CREATE)),
):
    return await LicenciaService(db).create(data)


@router.put("/{licencia_id}", response_model=LicenciaResponse)
async def update_licencia(
    licencia_id: UUID,
    data: LicenciaUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_LICENCIA_UPDATE)),
):
    return await LicenciaService(db).update(licencia_id, data)


@router.delete("/{licencia_id}", status_code=204)
async def delete_licencia(
    licencia_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_LICENCIA_DELETE)),
):
    await LicenciaService(db).delete(licencia_id)


@router.post("/{licencia_id}/aprobar", response_model=LicenciaResponse)
async def approve_licencia(
    licencia_id: UUID,
    data: LicenciaDecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_LICENCIA_APROBAR)),
):
    return await LicenciaService(db).approve(licencia_id, data, current_user)


@router.post("/{licencia_id}/rechazar", response_model=LicenciaResponse)
async def reject_licencia(
    licencia_id: UUID,
    data: LicenciaDecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_LICENCIA_APROBAR)),
):
    return await LicenciaService(db).reject(licencia_id, data, current_user)
