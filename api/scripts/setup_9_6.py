"""
Script para verificar qué hay el 9 de junio y crear inscripción si es necesario
"""

import asyncio
import os
import sys
from datetime import date, time
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select

from core.database import AsyncSessionLocal
from core.enums import DiaSemana, Disciplina
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.usuario import Usuario
from models.suscripciones import Suscripcion
from models.precio_disciplina import PrecioDisciplina


async def check_and_create_for_9_6():
    """Verifica el 9/6 y crea inscripción si es necesario"""
    async with AsyncSessionLocal() as session:
        fecha_9_6 = date(2026, 6, 9)
        print(f"Analizando {fecha_9_6}...")
        
        # Verificar qué clase hay ese día
        # El 9 de junio es miércoles
        clases_miercoles = (await session.execute(
            select(ClaseTemplate).where(
                ClaseTemplate.dia_semana == DiaSemana.MIERCOLES,
                ClaseTemplate.activo == True
            )
        )).scalars().all()

        print(f"\nClases de miércoles disponibles:")
        for clase in clases_miercoles:
            print(f"  - {clase.nombre} ({clase.disciplina.value}) {clase.hora_inicio}-{clase.hora_fin}")

        # Buscar si ya existe instancia para esa fecha
        instancia = (await session.execute(
            select(ClaseInstancia).where(ClaseInstancia.fecha == fecha_9_6)
        )).scalars().first()

        if not instancia and clases_miercoles:
            # Crear instancia para la primera clase de miércoles
            clase = clases_miercoles[0]
            instancia = ClaseInstancia(
                clase_template_id=clase.id,
                fecha=fecha_9_6,
                cupo=clase.capacidad_maxima,
                activo=True
            )
            session.add(instancia)
            await session.flush()
            print(f"\n✓ Creada instancia para {fecha_9_6}: {clase.nombre}")
        elif instancia:
            clase = (await session.execute(
                select(ClaseTemplate).where(ClaseTemplate.id == instancia.clase_template_id)
            )).scalars().first()
            print(f"\n✓ Instancia ya existe para {fecha_9_6}: {clase.nombre}")
        
        # Verificar inscripción de cliente@cef.ar
        cliente = (await session.execute(
            select(Usuario).where(Usuario.email == "cliente@cef.ar")
        )).scalars().first()

        if cliente and instancia:
            suscripcion = (await session.execute(
                select(Suscripcion).where(
                    Suscripcion.usuario_id == cliente.id,
                    Suscripcion.clase_template_id == instancia.clase_template_id,
                    Suscripcion.activo == True
                )
            )).scalars().first()

            if suscripcion:
                print(f"✓ cliente@cef.ar ya está inscripto")
            else:
                # Crear inscripción
                precio = (await session.execute(
                    select(PrecioDisciplina).where(
                        PrecioDisciplina.disciplina == clases_miercoles[0].disciplina
                    )
                )).scalars().first()

                nueva_sub = Suscripcion(
                    usuario_id=cliente.id,
                    clase_template_id=instancia.clase_template_id,
                    monto=precio.precio_suscripcion if precio else Decimal("0"),
                    fecha_inicio=fecha_9_6,
                    fecha_fin=fecha_9_6,
                    activo=True
                )
                session.add(nueva_sub)
                print(f"✓ Creada inscripción para cliente@cef.ar en {fecha_9_6}")

        await session.commit()


if __name__ == "__main__":
    asyncio.run(check_and_create_for_9_6())
