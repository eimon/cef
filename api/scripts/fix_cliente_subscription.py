"""
Script para corregir la suscripción de cliente@cef.ar
- Remover todas sus suscripciones actuales
- Crear una suscripción solo a la clase del 9/6
"""

import asyncio
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select
from sqlalchemy import and_

from core.database import AsyncSessionLocal
from models.usuario import Usuario
from models.suscripciones import Suscripcion
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.precio_disciplina import PrecioDisciplina


async def fix_client_subscription():
    """Corrige la suscripción de cliente@cef.ar a solo la clase del 9/6"""
    async with AsyncSessionLocal() as session:
        # Buscar al usuario cliente@cef.ar
        cliente = (await session.execute(
            select(Usuario).where(Usuario.email == "cliente@cef.ar")
        )).scalars().first()

        if not cliente:
            print("❌ Usuario cliente@cef.ar no encontrado")
            return

        print(f"✓ Usuario encontrado: {cliente.nombre} {cliente.apellido}")

        # Buscar la clase instancia del 8/6/2026
        fecha_objetivo = date(2026, 6, 8)
        instancia_9_6 = (await session.execute(
            select(ClaseInstancia).where(
                ClaseInstancia.fecha == fecha_objetivo
            )
        )).scalars().first()

        if not instancia_9_6:
            print(f"❌ No se encontró clase el {fecha_objetivo}")
            return

        print(f"✓ Clase encontrada para {fecha_objetivo}")
        
        # Obtener el template de esa clase instancia
        template = (await session.execute(
            select(ClaseTemplate).where(
                ClaseTemplate.id == instancia_9_6.clase_template_id
            )
        )).scalars().first()

        print(f"  Clase: {template.nombre} ({template.dia_semana.value}) {template.hora_inicio}-{template.hora_fin}")

        # Remover todas las suscripciones actuales del cliente
        suscripciones_existentes = (await session.execute(
            select(Suscripcion).where(
                Suscripcion.usuario_id == cliente.id,
                Suscripcion.activo == True
            )
        )).scalars().all()

        print(f"\nRemoviendо {len(suscripciones_existentes)} suscripción(es) existente(s)...")
        for sub in suscripciones_existentes:
            sub.activo = False
            print(f"  [ok] Desactivada suscripción {sub.id}")

        # Crear nueva suscripción a la clase del 9/6
        precio = (await session.execute(
            select(PrecioDisciplina).where(
                PrecioDisciplina.disciplina == template.disciplina
            )
        )).scalars().first()

        if not precio:
            print(f"❌ No hay precio para {template.disciplina.value}")
            return

        nueva_suscripcion = Suscripcion(
            usuario_id=cliente.id,
            clase_template_id=template.id,
            monto=precio.precio_suscripcion,
            fecha_inicio=fecha_objetivo,
            fecha_fin=fecha_objetivo,
            activo=True
        )
        session.add(nueva_suscripcion)

        await session.commit()
        print(f"\n✓ Nueva suscripción creada para {cliente.nombre}")
        print(f"  Clase: {template.nombre}")
        print(f"  Fecha: {fecha_objetivo}")
        print(f"  Monto: ${precio.precio_suscripcion}")


if __name__ == "__main__":
    asyncio.run(fix_client_subscription())
