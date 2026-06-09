from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import date, time

from core.enums import DiaSemana


class InstanciaSemanaResponse(BaseModel):
    id: UUID4
    fecha: date
    cancelada: bool
    cupo: int

    class Config:
        from_attributes = True


class ClaseSemanaResponse(BaseModel):
    id: UUID4
    nombre: str
    descripcion: Optional[str] = None
    dia_semana: DiaSemana
    hora_inicio: time
    hora_fin: time
    capacidad_maxima: int
    precio_individual: float
    precio_suscripcion: float
    disciplina: str
    profesor_id: Optional[UUID4] = None
    sala_id: Optional[UUID4] = None
    profesor_nombre: Optional[str] = None
    sala_nombre: Optional[str] = None
    fecha_en_semana: date
    cupo_disponible: int
    cupo_suscripcion_disponible: bool = True
    instancia: Optional[InstanciaSemanaResponse] = None
    inscrito: bool = False
    suscrito: bool = False
