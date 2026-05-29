import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Date, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base
from core.enums import UserRole


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    telefono = Column(String, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    nombre = Column(String(100), nullable=True)
    apellido = Column(String(100), nullable=True)
    fecha_nacimiento = Column(Date, nullable=True)
    dni = Column(String(20), unique=True, index=True, nullable=True)
    genero = Column(String(50), nullable=True)
    role = Column(Enum(UserRole, name="userrole"), default=UserRole.RECEPCION, nullable=False)
    activo = Column(Boolean, default=True)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    registration_completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    refresh_tokens = relationship("RefreshToken", back_populates="usuario", cascade="all, delete-orphan")
    registration_tokens = relationship("RegistrationToken", back_populates="usuario", cascade="all, delete-orphan")
    email_change_tokens = relationship("EmailChangeToken", back_populates="usuario", cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="usuario", cascade="all, delete-orphan")
    suscripciones = relationship("Suscripcion", back_populates="usuario")
    pagos = relationship("Pago", back_populates="usuario")
    asistencias = relationship("Asistencia", back_populates="usuario")
    ficha_medica = relationship("FichaMedica", back_populates="usuario", uselist=False)


from models.refresh_token import RefreshToken  # noqa: F401, E402
from models.registration_token import RegistrationToken  # noqa: F401, E402
