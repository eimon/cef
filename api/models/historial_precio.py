import uuid
from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from core.database import Base


class HistorialPrecio(Base):
    __tablename__ = "historial_precios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clase_template_id = Column(UUID(as_uuid=True), ForeignKey("clase_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(String(20), nullable=False)
    precio_anterior = Column(Numeric(10, 2), nullable=False)
    precio_nuevo = Column(Numeric(10, 2), nullable=False)
    fecha_cambio = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
