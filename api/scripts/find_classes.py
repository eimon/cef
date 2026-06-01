"""
Script para buscar las clases instancia cercanas a 9/6
"""

import asyncio
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select
from sqlalchemy import and_

from core.database import AsyncSessionLocal
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate


async def find_classes():
    """Busca clases instancia cercanas a 9/6"""
    async with AsyncSessionLocal() as session:
        # Buscar instancias en la semana del 9/6
        fecha_inicio = date(2026, 6, 1)
        fecha_fin = date(2026, 6, 15)
        
        instancias = (await session.execute(
            select(ClaseInstancia).where(
                and_(
                    ClaseInstancia.fecha >= fecha_inicio,
                    ClaseInstancia.fecha <= fecha_fin
                )
            )
        )).scalars().all()

        print(f"✓ {len(instancias)} clase(s) encontrada(s) entre {fecha_inicio} y {fecha_fin}:")
        for inst in instancias:
            template = (await session.execute(
                select(ClaseTemplate).where(ClaseTemplate.id == inst.clase_template_id)
            )).scalars().first()
            print(f"  {inst.fecha} - {template.nombre} ({template.dia_semana.value}) {template.hora_inicio}-{template.hora_fin}")


if __name__ == "__main__":
    asyncio.run(find_classes())
