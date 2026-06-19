from datetime import date
from decimal import Decimal
from pydantic import BaseModel, UUID4, Field

from core.enums import EstadoSuscripcion


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
    fecha_pago: date
    estado: EstadoSuscripcion
    fechas_clases: list[date]
    activo: bool


class RenovacionIniciadaResponse(BaseModel):
    siguiente_suscripcion_id: UUID4
    clase_nombre: str
    fecha_inicio: date
    fecha_fin: date
    precio_total: float


class RenovacionSuscripcionPendienteResponse(BaseModel):
    suscripcion_id: UUID4
    clase_template_id: UUID4
    clase_nombre: str
    disciplina: str
    fecha_inicio: date
    fecha_fin: date
    renovacion_disponible_desde: date
    renovacion_disponible_hasta: date
    nueva_fecha_inicio: date
    nueva_fecha_fin: date
    cantidad_clases: int
    precio_total: float
