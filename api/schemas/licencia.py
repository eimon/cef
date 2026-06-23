from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from core.enums import EstadoLicencia, TipoLicencia


class LicenciaBase(BaseModel):
    profesor_id: UUID
    fecha_inicio: date
    fecha_fin: date
    tipo: TipoLicencia
    motivo: Optional[str] = Field(None, max_length=500)
    profesor_reemplazo_id: Optional[UUID] = None


class LicenciaCreate(LicenciaBase):
    pass


class LicenciaUpdate(BaseModel):
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    tipo: Optional[TipoLicencia] = None
    motivo: Optional[str] = Field(None, max_length=500)
    profesor_reemplazo_id: Optional[UUID] = None


class LicenciaDecisionRequest(BaseModel):
    profesor_reemplazo_id: Optional[UUID] = None
    notas_admin: Optional[str] = Field(None, max_length=500)


class LicenciaResponse(BaseModel):
    id: UUID
    profesor_id: UUID
    profesor_reemplazo_id: Optional[UUID] = None
    fecha_inicio: date
    fecha_fin: date
    tipo: TipoLicencia
    estado: EstadoLicencia
    motivo: Optional[str] = None
    notas_admin: Optional[str] = None
    resuelto_por_id: Optional[UUID] = None
    resuelto_at: Optional[datetime] = None
    activo: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
