from pydantic import BaseModel, EmailStr, Field
from typing import Optional
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
    pass


class ProfesorUpdate(BaseModel):
    dni: Optional[str] = Field(None, min_length=1, max_length=20)
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    apellido: Optional[str] = Field(None, min_length=1, max_length=100)
    genero: Optional[str] = Field(None, min_length=1, max_length=50)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(None, max_length=50)


class ProfesorResponse(ProfesorBase):
    id: UUID
    activo: bool
    genero: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
