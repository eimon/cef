"""
Script para cambiar la clase de Pilates de Ana Pérez los martes a las 15:00
"""

import asyncio
import os
import sys
from datetime import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select

from core.database import AsyncSessionLocal
from core.enums import DiaSemana, Disciplina
from models.clase_template import ClaseTemplate
from models.profesor import Profesor


async def update_pilates_class():
    """Actualiza la clase de Pilates de Ana Pérez los martes a las 15:00"""
    async with AsyncSessionLocal() as session:
        # Buscar al profesor Ana Pérez
        profesor = (await session.execute(
            select(Profesor).where(
                Profesor.nombre == "Ana",
                Profesor.apellido == "Pérez"
            )
        )).scalars().first()

        if not profesor:
            print("❌ Profesor Ana Pérez no encontrado")
            return

        print(f"✓ Profesor encontrado: {profesor.nombre} {profesor.apellido}")

        # Buscar la clase de Pilates los martes de Ana Pérez
        clase = (await session.execute(
            select(ClaseTemplate).where(
                ClaseTemplate.profesor_id == profesor.id,
                ClaseTemplate.disciplina == Disciplina.PILATES,
                ClaseTemplate.dia_semana == DiaSemana.MARTES
            )
        )).scalars().first()

        if not clase:
            print("❌ Clase de Pilates los martes no encontrada")
            return

        print(f"✓ Clase encontrada: {clase.nombre}")
        print(f"  Hora actual: {clase.hora_inicio} - {clase.hora_fin}")

        # Actualizar la hora
        clase.hora_inicio = time(15, 0)
        clase.hora_fin = time(16, 0)

        await session.commit()
        print(f"✓ Clase actualizada a: {clase.hora_inicio} - {clase.hora_fin}")


if __name__ == "__main__":
    asyncio.run(update_pilates_class())
