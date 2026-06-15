from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from core.database import get_db
from dependencies.auth import get_current_user
from models.usuario import Usuario
from schemas.asistencia import EscaneoQRResponse
from services.asistencia_service import AsistenciaService

router = APIRouter(prefix="/asistencias", tags=["asistencias"])


@router.get("/escanear/{dni}", response_model=EscaneoQRResponse)
async def escanear_qr(
    dni: str,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    return await AsistenciaService(db).get_hoy_por_dni(dni)


@router.patch("/{asistencia_id}/marcar-presente", status_code=200)
async def marcar_presente(
    asistencia_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    await AsistenciaService(db).marcar_presente(asistencia_id)
    return {"ok": True}
