from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import date, time

from core.enums import EstadoPago, DiaSemana, EstadoSuscripcion


class MiClaseIndividualResponse(BaseModel):
    asistencia_id: UUID4
    clase_nombre: str
    disciplina: str
    fecha: date
    hora_inicio: time
    hora_fin: time
    profesor_nombre: Optional[str] = None
    sala_nombre: Optional[str] = None
    monto_pagado: Optional[float] = None
    estado_pago: Optional[EstadoPago] = None
    precio_clase: Optional[float] = None
    asistio: bool
    cancelo: bool

    class Config:
        from_attributes = True


class InstanciaEnSuscripcionResponse(BaseModel):
    instancia_id: UUID4
    fecha: date
    cancelada: bool

    class Config:
        from_attributes = True


class MiSuscripcionResponse(BaseModel):
    id: UUID4
    clase_template_id: UUID4
    clase_nombre: str
    disciplina: str
    dia_semana: DiaSemana
    hora_inicio: time
    hora_fin: time
    profesor_nombre: Optional[str] = None
    sala_nombre: Optional[str] = None
    fecha_inicio: date
    fecha_fin: date
    monto: float
    estado: EstadoSuscripcion
    activo: bool
    instancias: list[InstanciaEnSuscripcionResponse]

    class Config:
        from_attributes = True
