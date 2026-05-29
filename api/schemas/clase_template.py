from pydantic import BaseModel, UUID4, Field
from typing import Optional
from datetime import datetime, time

from core.enums import DiaSemana, Disciplina


class ClaseTemplateBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200)
    descripcion: Optional[str] = Field(None, max_length=500)
    dia_semana: DiaSemana
    disciplina: Disciplina
    hora_inicio: time
    hora_fin: time
    capacidad_maxima: int = Field(..., ge=1)
    precio_individual: float
    precio_suscripcion: float


class ClaseTemplateCreate(BaseModel):
    disciplina: Disciplina
    dia_semana: DiaSemana
    hora_inicio: time
    hora_fin: time
    sala_id: UUID4
    profesor_id: UUID4
    capacidad_maxima: int = Field(..., ge=1)


class ClaseTemplateUpdate(BaseModel):
    disciplina: Disciplina
    dia_semana: DiaSemana
    hora_inicio: time
    hora_fin: time
    sala_id: UUID4
    profesor_id: UUID4
    capacidad_maxima: int = Field(..., ge=1)


class ClaseTemplateResponse(ClaseTemplateBase):
    id: UUID4
    profesor_id: Optional[UUID4] = None
    sala_id: Optional[UUID4] = None
    profesor_nombre: Optional[str] = None
    sala_nombre: Optional[str] = None
    activo: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
