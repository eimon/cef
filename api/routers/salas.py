from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from schemas.sala import SalaCreate, SalaResponse, SalaUpdate
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


@router.post("/", response_model=SalaResponse, status_code=201)
async def create_sala(
    data: SalaCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(has_role(Role.ROLE_SALA_CREATE)),
):
    return await SalaService(db).create(data)


@router.put("/{sala_id}", response_model=SalaResponse)
async def update_sala(
    sala_id: UUID,
    data: SalaUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(has_role(Role.ROLE_SALA_UPDATE)),
):
    return await SalaService(db).update(sala_id, data)


@router.delete("/{sala_id}", status_code=204)
async def delete_sala(
    sala_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(has_role(Role.ROLE_SALA_DELETE)),
):
    await SalaService(db).delete(sala_id)
