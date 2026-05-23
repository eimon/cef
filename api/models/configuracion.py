from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func

from core.database import Base


class Configuracion(Base):
    __tablename__ = "configuraciones"

    clave = Column(String(100), primary_key=True)
    valor = Column(String(255), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
