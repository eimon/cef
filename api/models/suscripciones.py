import uuid
from sqlalchemy import Column, Boolean, DateTime, Date, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base


class Suscripcion(Base):
    __tablename__ = "suscripciones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    clase_template_id = Column(UUID(as_uuid=True), ForeignKey("clase_templates.id", ondelete="RESTRICT"), nullable=False, index=True)
    monto = Column(Numeric(10, 2), nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    usuario = relationship("Usuario", back_populates="suscripciones")
    clase_template = relationship("ClaseTemplate", backref="suscripciones")
    pagos = relationship("Pago", back_populates="suscripcion")
