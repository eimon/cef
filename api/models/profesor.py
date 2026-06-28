import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Table, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base

profesor_disciplinas = Table(
    "profesor_disciplinas",
    Base.metadata,
    Column("profesor_id", UUID(as_uuid=True), ForeignKey("profesores.id", ondelete="CASCADE"), primary_key=True),
    Column("disciplina_id", UUID(as_uuid=True), ForeignKey("disciplinas.id", ondelete="CASCADE"), primary_key=True),
)


class Profesor(Base):
    __tablename__ = "profesores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    dni = Column(String(20), unique=True, index=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    email = Column(String(255), nullable=True)
    telefono = Column(String(50), nullable=True)
    genero = Column(String(50), nullable=True)
    activo = Column(Boolean, default=True)
    disponible = Column(Boolean, default=True, nullable=False)
    licencia_activa_id = Column(
        UUID(as_uuid=True),
        ForeignKey("licencias.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    motivo_inactividad = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    clase_templates = relationship("ClaseTemplate", back_populates="profesor")
    disciplinas = relationship("Disciplina", secondary="profesor_disciplinas", lazy="selectin")
    licencias = relationship(
        "Licencia",
        foreign_keys="Licencia.profesor_id",
        back_populates="profesor",
    )
    licencia_activa = relationship("Licencia", foreign_keys=[licencia_activa_id])
