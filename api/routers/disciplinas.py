from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.roles import Role
from dependencies.auth import get_current_user, has_role
from models.usuario import Usuario
from schemas.disciplina import DisciplinaCreate, DisciplinaUpdate, DisciplinaResponse
from services.disciplina_service import DisciplinaService

router = APIRouter(prefix="/disciplinas", tags=["disciplinas"])


@router.get("/", response_model=List[DisciplinaResponse])
async def list_disciplinas(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    return await DisciplinaService(db).list_all()


@router.post("/", response_model=DisciplinaResponse, status_code=201)
async def create_disciplina(
    data: DisciplinaCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_DISCIPLINA_CREATE)),
):
    return await DisciplinaService(db).create(data)


@router.put("/{id}", response_model=DisciplinaResponse)
async def update_disciplina(
    id: UUID,
    data: DisciplinaUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_DISCIPLINA_UPDATE)),
):
    return await DisciplinaService(db).update(id, data)


@router.delete("/{id}", status_code=204)
async def delete_disciplina(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_DISCIPLINA_DELETE)),
):
    await DisciplinaService(db).delete(id)
