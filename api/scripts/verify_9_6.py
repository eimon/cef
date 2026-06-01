"""
Script para verificar los datos de la clase del 9/6
"""

import asyncio
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select

from core.database import AsyncSessionLocal
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.usuario import Usuario
from models.suscripciones import Suscripcion


async def verify_9_6():
    """Verifica los datos del 9/6"""
    async with AsyncSessionLocal() as session:
        fecha_9_6 = date(2026, 6, 9)
        
        # Buscar la instancia del 9/6
        instancia = (await session.execute(
            select(ClaseInstancia).where(ClaseInstancia.fecha == fecha_9_6)
        )).scalars().first()

        if not instancia:
            print(f"❌ No hay instancia para {fecha_9_6}")
            return

        template = (await session.execute(
            select(ClaseTemplate).where(ClaseTemplate.id == instancia.clase_template_id)
        )).scalars().first()

        print(f"✓ Instancia del {fecha_9_6}:")
        print(f"  Clase: {template.nombre} ({template.disciplina.value})")
        print(f"  Hora: {template.hora_inicio}-{template.hora_fin}")
        print(f"  Profesor: {template.profesor.nombre if template.profesor else 'Sin asignar'}")
        print(f"  Sala: {template.sala.nombre if template.sala else 'Sin asignar'}")

        # Buscar inscripciones para esa clase template
        suscripciones = (await session.execute(
            select(Suscripcion).where(
                Suscripcion.clase_template_id == template.id,
                Suscripcion.activo == True
            )
        )).scalars().all()

        print(f"\n✓ {len(suscripciones)} inscripción(es):")
        for sub in suscripciones:
            usuario = (await session.execute(
                select(Usuario).where(Usuario.id == sub.usuario_id)
            )).scalars().first()
            print(f"  - {usuario.nombre} {usuario.apellido} ({usuario.email})")
            print(f"    Fechas: {sub.fecha_inicio} a {sub.fecha_fin}")


if __name__ == "__main__":
    asyncio.run(verify_9_6())
