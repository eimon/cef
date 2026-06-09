from pydantic import BaseModel, Field
from datetime import datetime


class PrecioDisciplinaUpdate(BaseModel):
    precio_individual: float = Field(..., gt=0, description="Debe ser mayor a cero")
    precio_suscripcion: float = Field(..., gt=0, description="Debe ser mayor a cero")


class PrecioDisciplinaResponse(BaseModel):
    disciplina: str
    precio_individual: float
    precio_suscripcion: float
    updated_at: datetime

    class Config:
        from_attributes = True
