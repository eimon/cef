import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from core.database import Base
from core.enums import EstadoWaitlist


class WaitlistSuscripcionEntry(Base):
    __tablename__ = "waitlist_suscripcion_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    clase_template_id = Column(UUID(as_uuid=True), ForeignKey("clase_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha = Column(Date, nullable=False, index=True)
    posicion = Column(Integer, nullable=False)
    estado = Column(
        Enum(EstadoWaitlist, name="estadowaitlist", values_callable=lambda e: [i.value for i in e]),
        nullable=False,
        default=EstadoWaitlist.EN_ESPERA,
    )
    notificado_at = Column(DateTime(timezone=True), nullable=True)
    expira_at = Column(DateTime(timezone=True), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
