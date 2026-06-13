import uuid
from sqlalchemy import Column, Boolean, DateTime, Date, ForeignKey, Numeric, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base
from core.enums import EstadoSuscripcion


class Suscripcion(Base):
    __tablename__ = "suscripciones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    clase_template_id = Column(UUID(as_uuid=True), ForeignKey("clase_templates.id", ondelete="RESTRICT"), nullable=False, index=True)
    monto = Column(Numeric(10, 2), nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    fecha_pago = Column(Date, nullable=False)
    estado = Column(
        Enum(EstadoSuscripcion, name="estadosuscripcion", values_callable=lambda e: [i.value for i in e]),
        nullable=False,
        default=EstadoSuscripcion.VIGENTE,
    )
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    usuario = relationship("Usuario", back_populates="suscripciones")
    clase_template = relationship("ClaseTemplate", backref="suscripciones")
    pagos = relationship("Pago", back_populates="suscripcion")
    reservas = relationship("SuscripcionReserva", back_populates="suscripcion")


class SuscripcionReserva(Base):
    __tablename__ = "suscripcion_reservas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    suscripcion_id = Column(UUID(as_uuid=True), ForeignKey("suscripciones.id", ondelete="CASCADE"), nullable=False, index=True)
    clase_instancia_id = Column(UUID(as_uuid=True), ForeignKey("clase_instancias.id", ondelete="CASCADE"), nullable=False, index=True)
    activa = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    suscripcion = relationship("Suscripcion", back_populates="reservas")
    clase_instancia = relationship("ClaseInstancia", back_populates="reservas_suscripcion")
