from pydantic import BaseModel
from datetime import datetime


class ConfiguracionResponse(BaseModel):
    clave: str
    valor: str
    updated_at: datetime

    class Config:
        from_attributes = True


class SenaMinimaUpdate(BaseModel):
    valor: str


class DiasUpdate(BaseModel):
    valor: str
