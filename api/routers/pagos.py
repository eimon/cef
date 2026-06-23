from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from models.usuario import Usuario
from schemas.pago import DeudaPendienteResponse, MiPagoResponse
from schemas.suscripcion import PreviewRenovacionResponse, RenovacionSuscripcionPendienteResponse
from services.pago_service import PagoService
from services.suscripcion_service import SuscripcionService

router = APIRouter(prefix="/pagos", tags=["pagos"])


@router.get("/mios", response_model=list[MiPagoResponse])
async def get_mis_pagos(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).get_mis_pagos(current_user)


@router.get("/renovaciones-pendientes", response_model=list[RenovacionSuscripcionPendienteResponse])
async def get_renovaciones_pendientes(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await SuscripcionService(db).list_renovaciones_pendientes(current_user)


@router.get("/deudas-pendientes", response_model=list[DeudaPendienteResponse])
async def get_deudas_pendientes(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).list_deudas_pendientes(current_user)


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


@router.post("/mp/preferencia-waitlist")
async def crear_preferencia_waitlist_mp(
    waitlist_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).crear_preferencia_waitlist_mp(current_user, waitlist_id)


@router.post("/mp/confirmar-waitlist")
async def confirmar_waitlist_mp(
    payment_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).confirmar_waitlist_mp(current_user, payment_id)


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
    fecha_inicio: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).crear_preferencia_suscripcion_mp(current_user, clase_template_id, monto, fecha_inicio)


@router.post("/mp/confirmar-suscripcion")
async def confirmar_suscripcion_mp(
    payment_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).confirmar_suscripcion_mp(current_user, payment_id)


@router.get("/preview-renovacion-suscripcion", response_model=PreviewRenovacionResponse)
async def preview_renovacion_suscripcion(
    suscripcion_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).preview_renovacion_suscripcion(current_user, suscripcion_id)


@router.post("/mp/preferencia-renovacion-suscripcion")
async def crear_preferencia_renovacion_suscripcion_mp(
    suscripcion_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).crear_preferencia_renovacion_suscripcion_mp(current_user, suscripcion_id)


@router.post("/mp/confirmar-renovacion-suscripcion")
async def confirmar_renovacion_suscripcion_mp(
    payment_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await PagoService(db).confirmar_renovacion_suscripcion_mp(current_user, payment_id)
