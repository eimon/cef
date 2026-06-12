from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from models.usuario import Usuario
from schemas.pago import MiPagoResponse
from services.pago_service import PagoService

router = APIRouter(prefix="/pagos", tags=["pagos"])


@router.get("/mios", response_model=list[MiPagoResponse])
async def get_mis_pagos(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).get_mis_pagos(current_user)


@router.post("/mp/preferencia")
async def crear_preferencia_mp(
    clase_template_id: UUID = Query(...),
    fecha: date = Query(...),
    monto: float = Query(..., gt=0),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).crear_preferencia_mp(current_user, clase_template_id, fecha, monto)


@router.post("/mp/confirmar")
async def confirmar_pago_mp(
    payment_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).confirmar_pago_mp(current_user, payment_id)


@router.post("/mp/preferencia-deuda")
async def crear_preferencia_deuda_mp(
    asistencia_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).crear_preferencia_deuda_mp(current_user, asistencia_id)


@router.post("/mp/confirmar-deuda")
async def confirmar_deuda_mp(
    payment_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).confirmar_deuda_mp(current_user, payment_id)


@router.post("/mp/preferencia-suscripcion")
async def crear_preferencia_suscripcion_mp(
    clase_template_id: UUID = Query(...),
    monto: float = Query(..., gt=0),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).crear_preferencia_suscripcion_mp(current_user, clase_template_id, monto)


@router.post("/mp/confirmar-suscripcion")
async def confirmar_suscripcion_mp(
    payment_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).confirmar_suscripcion_mp(current_user, payment_id)
