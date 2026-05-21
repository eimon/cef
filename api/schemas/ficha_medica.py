from datetime import date, datetime
from typing import Any
from pydantic import BaseModel, UUID4, Field


class FichaMedicaBase(BaseModel):
    fecha: date
    cuerpo_ficha: str = Field(..., min_length=10)


class FichaMedicaCreate(FichaMedicaBase):
    usuario_id: UUID4


class FichaMedicaUpdateRequest(BaseModel):
    cuerpo_ficha: str = Field(..., min_length=10)


class FichaMedicaResponse(FichaMedicaBase):
    id: UUID4
    usuario_id: UUID4
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class FichaMedicaPerfilResponse(BaseModel):
    id: UUID4
    fecha: date
    cuerpo_ficha: dict[str, Any]
    created_at: datetime
    updated_at: datetime | None = None
