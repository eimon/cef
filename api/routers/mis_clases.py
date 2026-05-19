from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from core.database import get_db
from dependencies.auth import get_current_user
from models.usuario import Usuario
from schemas.mis_clases import MiClaseIndividualResponse, MiSuscripcionResponse
from services.mis_clases_service import MisClasesService

router = APIRouter(prefix="/mis-clases", tags=["mis-clases"])


@router.get("/individuales", response_model=List[MiClaseIndividualResponse])
async def get_mis_clases_individuales(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await MisClasesService(db).get_individuales(current_user.id)


@router.get("/suscripciones", response_model=List[MiSuscripcionResponse])
async def get_mis_suscripciones(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await MisClasesService(db).get_suscripciones(current_user.id)
