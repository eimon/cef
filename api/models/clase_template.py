import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Time, Integer, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base
from core.enums import DiaSemana, Disciplina


class ClaseTemplate(Base):
    __tablename__ = "clase_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(String(500), nullable=True)
    profesor_id = Column(UUID(as_uuid=True), ForeignKey("profesores.id", ondelete="SET NULL"), nullable=True, index=True)
    sala_id = Column(UUID(as_uuid=True), ForeignKey("salas.id", ondelete="SET NULL"), nullable=True, index=True)
    dia_semana = Column(Enum(DiaSemana, name="diasemana"), nullable=False)
    disciplina = Column(Enum(Disciplina, name="disciplina"), nullable=False)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    capacidad_maxima = Column(Integer, nullable=False)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    profesor = relationship("Profesor", back_populates="clase_templates")
    sala = relationship("Sala", back_populates="clase_templates")
    instancias = relationship("ClaseInstancia", back_populates="clase_template")
