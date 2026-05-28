import uuid
from sqlalchemy import Column, DateTime, Numeric, Enum
from sqlalchemy.sql import func
from core.database import Base
from core.enums import Disciplina


class PrecioDisciplina(Base):
    __tablename__ = "precios_disciplinas"

    disciplina = Column(Enum(Disciplina, name="disciplina", create_type=False), primary_key=True)
    precio_individual = Column(Numeric(10, 2), nullable=False)
    precio_suscripcion = Column(Numeric(10, 2), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
