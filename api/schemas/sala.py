from pydantic import BaseModel, UUID4, Field
from typing import Optional
from datetime import datetime


class SalaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200)
    capacidad: int = Field(..., ge=1)


class SalaCreate(SalaBase):
    pass


class SalaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=200)
    capacidad: Optional[int] = Field(None, ge=1)


class SalaResponse(SalaBase):
    id: UUID4
    activo: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
