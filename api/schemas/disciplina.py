from pydantic import BaseModel, UUID4, Field
from typing import Optional
from datetime import datetime


class DisciplinaCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    precio_individual: float = Field(..., gt=0, description="Debe ser mayor a cero")
    precio_suscripcion: float = Field(..., gt=0, description="Debe ser mayor a cero")


class DisciplinaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    precio_individual: Optional[float] = Field(None, gt=0)
    precio_suscripcion: Optional[float] = Field(None, gt=0)


class DisciplinaResponse(BaseModel):
    id: UUID4
    nombre: str
    precio_individual: float
    precio_suscripcion: float
    activo: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
