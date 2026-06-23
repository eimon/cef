from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.roles import Role
from dependencies.auth import has_role
from models.usuario import Usuario
from schemas.suscripcion import SuscripcionCreate, SuscripcionCheckResponse, SuscripcionResponse, RenovacionIniciadaResponse
from services.suscripcion_service import SuscripcionService

router = APIRouter(prefix="/suscripciones", tags=["suscripciones"])


@router.get("/check", response_model=SuscripcionCheckResponse)
async def check_elegibilidad(
    clase_template_id: UUID = Query(...),
    fecha_inicio: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_CLIENT)),
):
    return await SuscripcionService(db).check_elegibilidad(current_user, clase_template_id, fecha_inicio)


@router.post("/", response_model=SuscripcionResponse, status_code=201)
async def suscribirse(
    data: SuscripcionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_CLIENT)),
):
    return await SuscripcionService(db).suscribirse(current_user, data)


@router.post("/{suscripcion_id}/iniciar-renovacion", response_model=RenovacionIniciadaResponse, status_code=201)
async def iniciar_renovacion(
    suscripcion_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_CLIENT)),
):
    return await SuscripcionService(db).iniciar_renovacion(current_user, suscripcion_id)


@router.post("/cron/procesar", status_code=200)
async def procesar_renovaciones_cron(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_ADMIN)),
):
    return await SuscripcionService(db).procesar_renovaciones_cron()


@router.post("/cron/notificar-vencimientos", status_code=200)
async def notificar_vencimientos(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_ADMIN)),
):
    return await SuscripcionService(db).notificar_vencimientos_proximos()
