from pydantic import BaseModel, Field
from datetime import datetime

from core.enums import Disciplina


class PrecioDisciplinaUpdate(BaseModel):
    precio_individual: float = Field(..., gt=0, description="Debe ser mayor a cero")
    precio_suscripcion: float = Field(..., gt=0, description="Debe ser mayor a cero")


class PrecioDisciplinaResponse(BaseModel):
    disciplina: Disciplina
    precio_individual: float
    precio_suscripcion: float
    updated_at: datetime

    class Config:
        from_attributes = True
