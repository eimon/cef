from datetime import date
from decimal import Decimal
from pydantic import BaseModel, UUID4, Field


class SuscripcionCreate(BaseModel):
    clase_template_id: UUID4
    monto: Decimal = Field(..., gt=0, decimal_places=2)


class SuscripcionCheckResponse(BaseModel):
    elegible: bool
    fecha_inicio: date
    fecha_fin: date
    fechas_clases: list[date]
    precio_total: float
    monto_minimo: float


class SuscripcionResponse(BaseModel):
    id: UUID4
    clase_template_id: UUID4
    pago_id: UUID4
    monto: float
    fecha_inicio: date
    fecha_fin: date
    fechas_clases: list[date]
    activo: bool
