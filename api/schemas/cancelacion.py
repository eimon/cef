from pydantic import BaseModel
from typing import Optional


class CancelacionResponse(BaseModel):
    reintegro: str  # "none" | "mp" | "cupon"
    mensaje: str
    monto_reintegrado: Optional[float] = None
    descuento_porcentaje: Optional[float] = None
    refund_error: bool = False
