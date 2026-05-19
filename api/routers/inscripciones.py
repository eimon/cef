from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from models.usuario import Usuario
from schemas.inscripcion import InscripcionIndividualCreate, InscripcionResponse
from services.inscripcion_service import InscripcionService

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
