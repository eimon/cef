from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from schemas.sala import SalaResponse
from services.sala_service import SalaService
from core.database import get_db
from dependencies.auth import has_role
from core.roles import Role

router = APIRouter(prefix="/salas", tags=["salas"])


@router.get("/", response_model=List[SalaResponse])
async def list_salas(
    db: AsyncSession = Depends(get_db),
    _=Depends(has_role(Role.ROLE_SALA_LIST)),
):
    return await SalaService(db).list_all()
