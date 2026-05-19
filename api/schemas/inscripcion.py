from datetime import date
from decimal import Decimal
from pydantic import BaseModel, UUID4, Field


class InscripcionIndividualCreate(BaseModel):
    clase_template_id: UUID4
    fecha: date
    monto: Decimal = Field(..., gt=0, decimal_places=2)


class InscripcionResponse(BaseModel):
    asistencia_id: UUID4
    pago_id: UUID4
    monto: float
    clase_instancia_id: UUID4
