import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base
from core.enums import EstadoLicencia, TipoLicencia


class Licencia(Base):
    __tablename__ = "licencias"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    profesor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profesores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    profesor_reemplazo_id = Column(
        UUID(as_uuid=True),
        ForeignKey("profesores.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    fecha_inicio = Column(Date, nullable=False, index=True)
    fecha_fin = Column(Date, nullable=False, index=True)
    tipo = Column(
        Enum(TipoLicencia, name="tipolicencia", values_callable=lambda e: [i.value for i in e]),
        nullable=False,
    )
    estado = Column(
        Enum(EstadoLicencia, name="estadolicencia", values_callable=lambda e: [i.value for i in e]),
        nullable=False,
        default=EstadoLicencia.PENDIENTE,
    )
    motivo = Column(String(500), nullable=True)
    notas_admin = Column(String(500), nullable=True)
    resuelto_por_id = Column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    resuelto_at = Column(DateTime(timezone=True), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    disponibilidad_anulada = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    profesor = relationship("Profesor", foreign_keys=[profesor_id], back_populates="licencias")
    profesor_reemplazo = relationship("Profesor", foreign_keys=[profesor_reemplazo_id])
