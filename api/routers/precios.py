from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.roles import Role
from dependencies.auth import get_current_user, has_role
from models.usuario import Usuario
from schemas.precio_disciplina import PrecioDisciplinaUpdate, PrecioDisciplinaResponse
from services.precio_disciplina_service import PrecioDisciplinaService

router = APIRouter(prefix="/precios", tags=["precios"])


@router.get("/disciplinas", response_model=List[PrecioDisciplinaResponse])
async def list_precios(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    return await PrecioDisciplinaService(db).get_all()


@router.put("/disciplinas/{disciplina}", response_model=PrecioDisciplinaResponse)
async def update_precio_disciplina(
    disciplina: str,
    data: PrecioDisciplinaUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(has_role(Role.ROLE_PRECIO_UPDATE)),
):
    return await PrecioDisciplinaService(db).update(disciplina, data)
