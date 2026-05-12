import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base


class FichaMedica(Base):
    __tablename__ = "fichas_medicas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    fecha = Column(Date, nullable=False)
    cuerpo_ficha = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    usuario = relationship("Usuario", back_populates="ficha_medica")
