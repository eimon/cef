import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete

from models.cupon_descuento import CuponDescuento
from models.suscripciones import Suscripcion


class CuponDescuentoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, suscripcion_id: uuid.UUID, descuento_porcentaje: Decimal) -> CuponDescuento:
        cupon = CuponDescuento(
            suscripcion_id=suscripcion_id,
            descuento_porcentaje=descuento_porcentaje,
            usado=False,
        )
        self.db.add(cupon)
        await self.db.flush()
        await self.db.refresh(cupon)
        return cupon

    async def count_by_suscripcion(self, suscripcion_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).where(CuponDescuento.suscripcion_id == suscripcion_id)
        )
        return result.scalar() or 0

    async def list_unused_for_renewal(
        self, usuario_id: uuid.UUID, clase_template_id: uuid.UUID
    ) -> list[CuponDescuento]:
        result = await self.db.execute(
            select(CuponDescuento)
            .join(Suscripcion, CuponDescuento.suscripcion_id == Suscripcion.id)
            .where(
                Suscripcion.usuario_id == usuario_id,
                Suscripcion.clase_template_id == clase_template_id,
                CuponDescuento.usado == False,
            )
        )
        return list(result.scalars().all())

    async def mark_used(self, cupones: list[CuponDescuento]) -> None:
        for cupon in cupones:
            cupon.usado = True
        await self.db.flush()

    async def delete_unused_by_suscripcion(self, suscripcion_id: uuid.UUID) -> None:
        await self.db.execute(
            delete(CuponDescuento).where(
                CuponDescuento.suscripcion_id == suscripcion_id,
                CuponDescuento.usado == False,
            )
        )
