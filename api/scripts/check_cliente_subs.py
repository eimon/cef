"""
Script para ver todas las suscripciones de cliente@cef.ar
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select

from core.database import AsyncSessionLocal
from models.usuario import Usuario
from models.suscripciones import Suscripcion
from models.clase_template import ClaseTemplate


async def check_cliente_subs():
    """Verifica todas las suscripciones de cliente@cef.ar"""
    async with AsyncSessionLocal() as session:
        cliente = (await session.execute(
            select(Usuario).where(Usuario.email == "cliente@cef.ar")
        )).scalars().first()

        if not cliente:
            print("❌ cliente@cef.ar no existe")
            return

        print(f"Usuario: {cliente.nombre} {cliente.apellido}")
        print(f"Email: {cliente.email}\n")

        suscripciones = (await session.execute(
            select(Suscripcion).where(
                Suscripcion.usuario_id == cliente.id,
                Suscripcion.activo == True
            )
        )).scalars().all()

        print(f"✓ {len(suscripciones)} suscripción(es) activa(s):\n")
        for sub in suscripciones:
            template = (await session.execute(
                select(ClaseTemplate).where(ClaseTemplate.id == sub.clase_template_id)
            )).scalars().first()
            
            print(f"  - {template.nombre} ({template.disciplina.value})")
            print(f"    Día semana: {template.dia_semana.value}")
            print(f"    Hora: {template.hora_inicio}-{template.hora_fin}")
            print(f"    Suscripción válida: {sub.fecha_inicio} a {sub.fecha_fin}")
            print()


if __name__ == "__main__":
    asyncio.run(check_cliente_subs())
