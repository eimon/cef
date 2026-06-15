from pydantic import BaseModel, UUID4
from core.enums import TipoInscripcion


class InstanciaHoyItem(BaseModel):
    instancia_id: UUID4
    clase_nombre: str
    disciplina: str
    hora_inicio: str
    hora_fin: str
    sala_nombre: str


class AsistenciaRecepcionResponse(BaseModel):
    asistencia_id: UUID4
    usuario_nombre: str
    tipo: TipoInscripcion
    asistio: bool
    cancelo: bool

    class Config:
        from_attributes = True


class AsistenciaEscaneoItem(BaseModel):
    asistencia_id: UUID4
    clase_nombre: str
    disciplina: str
    hora_inicio: str
    hora_fin: str
    tipo: TipoInscripcion
    asistio: bool
    cancelo: bool
    puede_marcar: bool
    razon_no_puede: str | None = None


class EscaneoQRResponse(BaseModel):
    usuario_nombre: str
    asistencias: list[AsistenciaEscaneoItem]
