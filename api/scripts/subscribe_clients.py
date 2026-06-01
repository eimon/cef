"""
Script para suscribir a todos los usuarios clientes a las clases de miércoles y viernes
"""

import asyncio
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select

from core.database import AsyncSessionLocal
from core.enums import DiaSemana, UserRole
from models.usuario import Usuario
from models.clase_template import ClaseTemplate
from models.precio_disciplina import PrecioDisciplina
from models.suscripciones import Suscripcion


async def subscribe_clients_to_classes():
    """Suscribe a todos los clientes a las clases de miércoles y viernes"""
    async with AsyncSessionLocal() as session:
        # Obtener todos los usuarios clientes
        clientes = (await session.execute(
            select(Usuario).where(Usuario.role == UserRole.CLIENTE)
        )).scalars().all()

        if not clientes:
            print("❌ No se encontraron clientes")
            return

        print(f"✓ {len(clientes)} cliente(s) encontrado(s)")
        for cliente in clientes:
            print(f"  - {cliente.nombre} {cliente.apellido}")

        # Obtener todas las clases de miércoles y viernes
        clases = (await session.execute(
            select(ClaseTemplate).where(
                ClaseTemplate.dia_semana.in_([DiaSemana.MIERCOLES, DiaSemana.VIERNES]),
                ClaseTemplate.activo == True
            )
        )).scalars().all()

        if not clases:
            print("❌ No se encontraron clases de miércoles y viernes")
            return

        print(f"\n✓ {len(clases)} clase(s) encontrada(s)")
        for clase in clases:
            print(f"  - {clase.nombre} ({clase.dia_semana.value}) {clase.hora_inicio}-{clase.hora_fin}")

        # Para cada cliente, crear suscripciones a cada clase
        fecha_inicio = date.today()
        fecha_fin = fecha_inicio + timedelta(days=30)
        
        count = 0
        for cliente in clientes:
            for clase in clases:
                # Verificar si ya existe suscripción
                existe = (await session.execute(
                    select(Suscripcion).where(
                        Suscripcion.usuario_id == cliente.id,
                        Suscripcion.clase_template_id == clase.id,
                        Suscripcion.activo == True
                    )
                )).scalars().first()

                if existe:
                    print(f"  [skip] {cliente.nombre} - {clase.nombre}")
                    continue

                # Obtener el precio de suscripción de la disciplina
                precio = (await session.execute(
                    select(PrecioDisciplina).where(
                        PrecioDisciplina.disciplina == clase.disciplina
                    )
                )).scalars().first()

                if not precio:
                    print(f"  [error] No hay precio para la disciplina {clase.disciplina.value}")
                    continue

                # Crear la suscripción
                suscripcion = Suscripcion(
                    usuario_id=cliente.id,
                    clase_template_id=clase.id,
                    monto=precio.precio_suscripcion,
                    fecha_inicio=fecha_inicio,
                    fecha_fin=fecha_fin,
                    activo=True
                )
                session.add(suscripcion)
                print(f"  [ok] {cliente.nombre} -> {clase.nombre}")
                count += 1

        await session.commit()
        print(f"\n✓ {count} suscripción(es) creada(s)")


if __name__ == "__main__":
    asyncio.run(subscribe_clients_to_classes())
