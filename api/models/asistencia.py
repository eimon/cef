import uuid
from sqlalchemy import Column, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base
from core.enums import TipoInscripcion


class Asistencia(Base):
    __tablename__ = "asistencias"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    clase_instancia_id = Column(UUID(as_uuid=True), ForeignKey("clase_instancias.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(
        Enum(TipoInscripcion, name="tipoinscripcion", values_callable=lambda e: [i.value for i in e]),
        nullable=False,
        default=TipoInscripcion.INDIVIDUAL,
    )
    asistio = Column(Boolean, default=True)
    cancelo = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    usuario = relationship("Usuario", back_populates="asistencias")
    clase_instancia = relationship("ClaseInstancia", back_populates="asistencias")
