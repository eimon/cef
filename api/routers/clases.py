from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from schemas.clase_template import ClaseTemplateResponse
from services.clase_template_service import ClaseTemplateService
from core.database import get_db
from dependencies.auth import get_current_user
from models.usuario import Usuario

router = APIRouter(prefix="/clases", tags=["clases"])


@router.get("/", response_model=List[ClaseTemplateResponse])
async def list_clases(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await ClaseTemplateService(db).list(skip, limit)


@router.get("/{clase_id}", response_model=ClaseTemplateResponse)
async def get_clase(
    clase_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await ClaseTemplateService(db).get(clase_id)
