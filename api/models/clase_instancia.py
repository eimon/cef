import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Date, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base


class ClaseInstancia(Base):
    __tablename__ = "clase_instancias"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    clase_template_id = Column(UUID(as_uuid=True), ForeignKey("clase_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha = Column(Date, nullable=False)
    # cupo regular para suscriptos
    cupo = Column(Integer, nullable=False)
    cancelada = Column(Boolean, default=False)
    motivo_cancelacion = Column(String(500), nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    clase_template = relationship("ClaseTemplate", back_populates="instancias")
    asistencias = relationship("Asistencia", back_populates="clase_instancia")
    pagos = relationship("Pago", back_populates="clase_instancia")
    reservas_suscripcion = relationship("SuscripcionReserva", back_populates="clase_instancia")
