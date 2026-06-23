from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from core.enums import UserRole
from datetime import datetime, date


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AvisoMasivoRequest(BaseModel):
    mensaje: str = Field(min_length=10)


class AvisoMasivoResponse(BaseModel):
    enviados: int
    total: int


class UsuarioBase(BaseModel):
    email: EmailStr
    telefono: Optional[str] = None
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    dni: Optional[str] = None
    genero: Optional[str] = None
    role: str


class UsuarioCreate(UsuarioBase):
    password: str


class PublicSignupRequest(BaseModel):
    email: EmailStr
    telefono: Optional[str] = None
    nombre: str = Field(..., min_length=1, max_length=100)
    apellido: str = Field(..., min_length=1, max_length=100)
    fecha_nacimiento: Optional[date] = None
    dni: Optional[str] = Field(None, max_length=20)
    genero: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=8)


class PublicSignupResponse(BaseModel):
    detail: str


class UsuarioUpdate(BaseModel):
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    dni: Optional[str] = None
    genero: Optional[str] = None
    activo: Optional[bool] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None


class UsuarioResponse(UsuarioBase):
    id: UUID
    activo: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class VerifyEmailRequest(BaseModel):
    token: str


class VerifyEmailResponse(BaseModel):
    detail: str
    onboarding_token: str


class EmailChangeRequest(BaseModel):
    new_email: EmailStr


class EmailChangeRequestResponse(BaseModel):
    detail: str


class EmailChangeConfirmRequest(BaseModel):
    token: str


class EmailChangeConfirmResponse(BaseModel):
    detail: str
    email: EmailStr


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetRequestResponse(BaseModel):
    detail: str


class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: str


class PasswordResetConfirmResponse(BaseModel):
    detail: str


class PublicFichaMedicaRequest(BaseModel):
    token: str
    cuerpo_ficha: str = Field(..., min_length=10)


class TokenData(BaseModel):
    email: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
