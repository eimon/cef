import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base


class Sala(Base):
    __tablename__ = "salas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    nombre = Column(String(200), nullable=False)
    # sede: reservado para soporte multi-sede futuro
    sede = Column(String(200), nullable=True)
    capacidad = Column(Integer, nullable=False)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    clase_templates = relationship("ClaseTemplate", back_populates="sala")
