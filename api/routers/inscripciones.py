from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from models.usuario import Usuario
from schemas.inscripcion import (
    InscripcionIndividualCreate,
    InscripcionResponse,
    WaitlistEntryResponse,
    WaitlistJoinCreate,
    WaitlistJoinResponse,
    WaitlistSuscripcionEntryResponse,
    WaitlistSuscripcionJoinCreate,
    WaitlistSuscripcionJoinResponse,
    WaitlistSuscripcionStatusResponse,
    WaitlistStatusResponse,
)
from services.inscripcion_service import InscripcionService
from services.waitlist_service import WaitlistService
from services.waitlist_suscripcion_service import WaitlistSuscripcionService

router = APIRouter(prefix="/inscripciones", tags=["inscripciones"])


@router.get("/individual/check", status_code=200)
async def check_elegibilidad_individual(
    clase_template_id: UUID = Query(...),
    fecha: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    await InscripcionService(db).check_elegibilidad(current_user, clase_template_id, fecha)
    return {"elegible": True}


@router.post("/individual", response_model=InscripcionResponse, status_code=201)
async def inscribirse_individual(
    data: InscripcionIndividualCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await InscripcionService(db).inscribir_individual(current_user, data)


@router.post("/waitlist", response_model=WaitlistJoinResponse, status_code=201)
async def anotarse_waitlist(
    data: WaitlistJoinCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await WaitlistService(db).join_waitlist(current_user, data)


@router.get("/waitlist/mias", response_model=list[WaitlistEntryResponse], status_code=200)
async def listar_mis_waitlist(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await WaitlistService(db).list_my_waitlist(current_user)


@router.delete("/waitlist/{waitlist_id}", status_code=204)
async def cancelar_waitlist(
    waitlist_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    await WaitlistService(db).cancel_waitlist(current_user, waitlist_id)


@router.get("/waitlist/{waitlist_id}/status", response_model=WaitlistStatusResponse, status_code=200)
async def estado_waitlist(
    waitlist_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await WaitlistService(db).get_status(current_user, waitlist_id)


@router.post("/waitlist-suscripcion", response_model=WaitlistSuscripcionJoinResponse, status_code=201)
async def anotarse_waitlist_suscripcion(
    data: WaitlistSuscripcionJoinCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await WaitlistSuscripcionService(db).join_waitlist(current_user, data)


@router.get(
    "/waitlist-suscripcion/mias",
    response_model=list[WaitlistSuscripcionEntryResponse],
    status_code=200,
)
async def listar_mis_waitlist_suscripcion(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await WaitlistSuscripcionService(db).list_my_waitlist(current_user)


@router.delete("/waitlist-suscripcion/{waitlist_id}", status_code=204)
async def cancelar_waitlist_suscripcion(
    waitlist_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    await WaitlistSuscripcionService(db).cancel_waitlist(current_user, waitlist_id)


@router.get(
    "/waitlist-suscripcion/{waitlist_id}/status",
    response_model=WaitlistSuscripcionStatusResponse,
    status_code=200,
)
async def estado_waitlist_suscripcion(
    waitlist_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await WaitlistSuscripcionService(db).get_status(current_user, waitlist_id)
