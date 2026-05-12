import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Numeric, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base
from core.enums import EstadoPago


class Pago(Base):
    __tablename__ = "pagos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    suscripcion_id = Column(UUID(as_uuid=True), ForeignKey("suscripciones.id", ondelete="SET NULL"), nullable=True, index=True)
    clase_instancia_id = Column(UUID(as_uuid=True), ForeignKey("clase_instancias.id", ondelete="SET NULL"), nullable=True, index=True)
    monto = Column(Numeric(10, 2), nullable=False)
    fecha_pago = Column(DateTime(timezone=True), nullable=False)
    estado = Column(Enum(EstadoPago, name="estadopago"), nullable=False, default=EstadoPago.PENDIENTE)
    mp_payment_id = Column(String(100), nullable=True, index=True)
    descripcion = Column(String(500), nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    usuario = relationship("Usuario", back_populates="pagos")
    suscripcion = relationship("Suscripcion", back_populates="pagos")
    clase_instancia = relationship("ClaseInstancia", back_populates="pagos")
