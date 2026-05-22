from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime


class SalaResponse(BaseModel):
    id: UUID4
    nombre: str
    capacidad: Optional[int] = None
    activo: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
