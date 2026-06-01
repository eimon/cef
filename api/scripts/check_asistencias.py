"""
Script para verificar qué devuelve el API para las asistencias
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select

from core.database import AsyncSessionLocal
from models.asistencia import Asistencia
from models.clase_instancia import ClaseInstancia
from models.usuario import Usuario


async def check_asistencias():
    """Verifica qué asistencias existen para la clase del 9/6"""
    async with AsyncSessionLocal() as session:
        # La instancia del 9/6
        instancia_id = "aa768193-5634-450c-8eef-6db2d9c13661"
        
        asistencias = (await session.execute(
            select(Asistencia).where(Asistencia.clase_instancia_id == instancia_id)
        )).scalars().all()

        print(f"✓ {len(asistencias)} asistencia(s) encontrada(s) para la instancia del 9/6:\n")
        for asist in asistencias:
            usuario = (await session.execute(
                select(Usuario).where(Usuario.id == asist.usuario_id)
            )).scalars().first()
            print(f"  - {usuario.nombre} {usuario.apellido}")
            print(f"    Tipo: {asist.tipo.value}")
            print(f"    Asistió: {asist.asistio}")
            print(f"    Canceló: {asist.cancelo}")
            print()


if __name__ == "__main__":
    asyncio.run(check_asistencias())
