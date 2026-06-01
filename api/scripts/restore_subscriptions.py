"""
Script para restaurar las suscripciones removidas de cliente@cef.ar
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select
from uuid import UUID

from core.database import AsyncSessionLocal
from models.suscripciones import Suscripcion


async def restore_subscriptions():
    """Restaura las suscripciones removidas"""
    async with AsyncSessionLocal() as session:
        # IDs de las suscripciones que fueron desactivadas
        subscription_ids = [
            UUID('d12c7585-74bb-47bf-9b97-20600caf2339'),
            UUID('dee280b7-2dbf-4af0-a950-59a55c062b55'),
            UUID('d462fba4-d404-4fd1-98ca-396260da1789'),
        ]

        for sub_id in subscription_ids:
            suscripcion = (await session.execute(
                select(Suscripcion).where(Suscripcion.id == sub_id)
            )).scalars().first()

            if not suscripcion:
                print(f"❌ Suscripción {sub_id} no encontrada")
                continue

            suscripcion.activo = True
            print(f"✓ Reactivada suscripción: {suscripcion.id}")

        await session.commit()
        print(f"\n✓ {len(subscription_ids)} suscripción(es) restaurada(s)")


if __name__ == "__main__":
    asyncio.run(restore_subscriptions())
