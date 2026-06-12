import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from core.enums import EstadoPago
from models.clase_instancia import ClaseInstancia
from models.pagos import Pago
from models.suscripciones import Suscripcion


class PagoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_mp_payment_id(self, mp_payment_id: str) -> Pago | None:
        result = await self.db.execute(
            select(Pago).where(Pago.mp_payment_id == mp_payment_id)
        )
        return result.scalars().first()

    async def list_by_usuario(self, usuario_id: uuid.UUID) -> list[Pago]:
        result = await self.db.execute(
            select(Pago)
            .options(
                selectinload(Pago.clase_instancia)
                .selectinload(ClaseInstancia.clase_template),
                selectinload(Pago.suscripcion)
                .selectinload(Suscripcion.clase_template),
            )
            .where(
                Pago.usuario_id == usuario_id,
                Pago.activo == True,
                Pago.estado == EstadoPago.PAGADO,
            )
            .order_by(Pago.fecha_pago.desc(), Pago.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_failed_mp(
        self,
        usuario_id: uuid.UUID,
        payment_id: str,
        monto: Decimal,
        descripcion: str,
    ) -> Pago:
        existing = await self.get_by_mp_payment_id(payment_id)
        if existing:
            return existing

        pago = Pago(
            usuario_id=usuario_id,
            monto=monto,
            fecha_pago=datetime.now(timezone.utc),
            estado=EstadoPago.ANULADO,
            mp_payment_id=payment_id,
            descripcion=descripcion,
            activo=True,
        )
        self.db.add(pago)
        await self.db.flush()
        await self.db.refresh(pago)
        return pago
