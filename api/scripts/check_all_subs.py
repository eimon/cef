"""
Script para ver TODAS las suscripciones de cliente@cef.ar, incluyendo inactivas
"""

import asyncio
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select

from core.database import AsyncSessionLocal
from models.usuario import Usuario
from models.suscripciones import Suscripcion
from models.clase_template import ClaseTemplate


async def check_all_subs():
    """Verifica TODAS las suscripciones sin filtro de activo"""
    async with AsyncSessionLocal() as session:
        cliente = (await session.execute(
            select(Usuario).where(Usuario.email == "cliente@cef.ar")
        )).scalars().first()

        if not cliente:
            print("❌ cliente@cef.ar no existe")
            return

        print(f"Usuario: {cliente.nombre} {cliente.apellido} ({cliente.email})\n")

        # SIN filtro de activo
        suscripciones = (await session.execute(
            select(Suscripcion).where(
                Suscripcion.usuario_id == cliente.id
            )
        )).scalars().all()

        print(f"✓ {len(suscripciones)} suscripción(es) TOTAL (activas e inactivas):\n")
        for i, sub in enumerate(suscripciones, 1):
            template = (await session.execute(
                select(ClaseTemplate).where(ClaseTemplate.id == sub.clase_template_id)
            )).scalars().first()
            
            print(f"{i}. {template.nombre} ({template.disciplina.value})")
            print(f"   Activa: {sub.activo}")
            print(f"   Fechas: {sub.fecha_inicio} a {sub.fecha_fin}")
            
            # Verificar si cubre el 9/6
            fecha_9_6 = date(2026, 6, 9)
            if sub.fecha_inicio <= fecha_9_6 <= sub.fecha_fin:
                print(f"   ✓ CUBRE 9/6")
            else:
                print(f"   ❌ NO cubre 9/6")
            print()


if __name__ == "__main__":
    asyncio.run(check_all_subs())
