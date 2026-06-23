import uuid
from sqlalchemy import Column, Boolean, DateTime, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base


class CuponDescuento(Base):
    __tablename__ = "cupones_descuento"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    suscripcion_id = Column(
        UUID(as_uuid=True),
        ForeignKey("suscripciones.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    descuento_porcentaje = Column(Numeric(5, 2), nullable=False)
    usado = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    suscripcion = relationship("Suscripcion", back_populates="cupones")
