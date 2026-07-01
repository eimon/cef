from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, UUID4, Field

from core.enums import EstadoWaitlist


class InscripcionIndividualCreate(BaseModel):
    clase_template_id: UUID4
    fecha: date
    monto: Decimal = Field(..., gt=0, decimal_places=2)


class InscripcionResponse(BaseModel):
    asistencia_id: UUID4
    pago_id: UUID4
    monto: float
    clase_instancia_id: UUID4


class WaitlistJoinCreate(BaseModel):
    clase_template_id: UUID4
    fecha: date


class WaitlistJoinResponse(BaseModel):
    waitlist_id: UUID4
    posicion: int
    estado: EstadoWaitlist
    clase_template_id: UUID4
    fecha: date


class WaitlistEntryResponse(BaseModel):
    id: UUID4
    clase_template_id: UUID4
    clase_nombre: str
    disciplina: str
    fecha: date
    posicion: int
    estado: EstadoWaitlist
    notificado_at: datetime | None = None
    expira_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class WaitlistStatusResponse(BaseModel):
    id: UUID4
    estado: EstadoWaitlist
    posicion: int
    expira_at: datetime | None = None


class WaitlistSuscripcionJoinCreate(BaseModel):
    clase_template_id: UUID4
    fecha: date


class WaitlistSuscripcionJoinResponse(BaseModel):
    waitlist_id: UUID4
    posicion: int
    estado: EstadoWaitlist
    clase_template_id: UUID4
    fecha: date


class WaitlistSuscripcionEntryResponse(BaseModel):
    id: UUID4
    clase_template_id: UUID4
    clase_nombre: str
    disciplina: str
    fecha: date
    posicion: int
    estado: EstadoWaitlist
    notificado_at: datetime | None = None
    expira_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class WaitlistSuscripcionStatusResponse(BaseModel):
    id: UUID4
    estado: EstadoWaitlist
    posicion: int
    expira_at: datetime | None = None
