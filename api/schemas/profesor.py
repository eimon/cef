from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class ProfesorBase(BaseModel):
    dni: str = Field(..., min_length=1, max_length=20)
    nombre: str = Field(..., min_length=1, max_length=100)
    apellido: str = Field(..., min_length=1, max_length=100)
    genero: str = Field(..., min_length=1, max_length=50)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(None, max_length=50)


class ProfesorCreate(ProfesorBase):
    disciplinas: List[str] = Field(default_factory=list)


class ProfesorUpdate(BaseModel):
    dni: Optional[str] = Field(None, min_length=1, max_length=20)
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    apellido: Optional[str] = Field(None, min_length=1, max_length=100)
    genero: Optional[str] = Field(None, min_length=1, max_length=50)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(None, max_length=50)
    disciplinas: Optional[List[str]] = None


class ProfesorResponse(ProfesorBase):
    id: UUID
    activo: bool
    genero: Optional[str] = None
    disciplinas: List[str] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_validator("disciplinas", mode="before")
    @classmethod
    def parse_disciplinas(cls, v):
        if v is None:
            return []
        return [d.nombre if hasattr(d, "nombre") else d for d in v]

    class Config:
        from_attributes = True
