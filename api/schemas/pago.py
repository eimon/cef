from datetime import datetime
from typing import Optional

from pydantic import BaseModel, UUID4

from core.enums import EstadoPago


class MiPagoResponse(BaseModel):
    id: UUID4
    monto: float
    fecha_pago: datetime
    estado: EstadoPago
    mp_payment_id: Optional[str] = None
    descripcion: Optional[str] = None
    tipo: str
    clase_nombre: Optional[str] = None
    disciplina: Optional[str] = None
    suscripcion_id: Optional[UUID4] = None

    class Config:
        from_attributes = True


class DeudaPendienteResponse(BaseModel):
    asistencia_id: UUID4
    clase_nombre: str
    disciplina: str
    fecha: datetime
    hora_inicio: str
    monto_pagado: float
    precio_total: float
    monto_restante: float
