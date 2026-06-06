"""
Script para convertir la suscripción a inscripción individual del 9/6
"""

import asyncio
import os
import sys
from datetime import datetime, date
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select

from core.database import AsyncSessionLocal
from core.timezone import LOCAL_TZ
from core.enums import TipoInscripcion, EstadoPago
from models.usuario import Usuario
from models.suscripciones import Suscripcion
from models.asistencia import Asistencia
from models.pagos import Pago
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.precio_disciplina import PrecioDisciplina


async def convert_to_individual():
    """Convierte suscripción a inscripción individual para 9/6"""
    async with AsyncSessionLocal() as session:
        # Buscar cliente@cef.ar
        cliente = (await session.execute(
            select(Usuario).where(Usuario.email == "cliente@cef.ar")
        )).scalars().first()

        if not cliente:
            print("❌ cliente@cef.ar no encontrado")
            return

        print(f"✓ Usuario: {cliente.nombre} {cliente.apellido}\n")

        # Desactivar TODAS las suscripciones
        suscripciones = (await session.execute(
            select(Suscripcion).where(
                Suscripcion.usuario_id == cliente.id,
                Suscripcion.activo == True
            )
        )).scalars().all()

        print(f"Desactivando {len(suscripciones)} suscripción(es)...")
        for sub in suscripciones:
            sub.activo = False
            print(f"  [ok] Suscripción desactivada")

        # Obtener la instancia del 9/6
        fecha_9_6 = date(2026, 6, 9)
        instancia = (await session.execute(
            select(ClaseInstancia).where(
                ClaseInstancia.fecha == fecha_9_6
            )
        )).scalars().first()

        if not instancia:
            print("❌ No existe clase para el 9/6")
            return

        template = (await session.execute(
            select(ClaseTemplate).where(ClaseTemplate.id == instancia.clase_template_id)
        )).scalars().first()

        print(f"\nCreando inscripción individual:")
        print(f"  Clase: {template.nombre} ({template.disciplina.value})")
        print(f"  Fecha: {fecha_9_6}")
        print(f"  Hora: {template.hora_inicio}-{template.hora_fin}")

        # Obtener precio
        precio = (await session.execute(
            select(PrecioDisciplina).where(
                PrecioDisciplina.disciplina == template.disciplina
            )
        )).scalars().first()

        monto = precio.precio_individual if precio else Decimal("1500")

        # Crear Asistencia (inscripción individual)
        asistencia = Asistencia(
            usuario_id=cliente.id,
            clase_instancia_id=instancia.id,
            tipo=TipoInscripcion.INDIVIDUAL,
            asistio=True,
            cancelo=False
        )
        session.add(asistencia)
        await session.flush()

        # Crear Pago
        pago = Pago(
            usuario_id=cliente.id,
            clase_instancia_id=instancia.id,
            suscripcion_id=None,
            monto=monto,
            fecha_pago=datetime.now(LOCAL_TZ),
            estado=EstadoPago.PAGADO,
            descripcion=f"Inscripción individual a {template.nombre} del {fecha_9_6}",
            activo=True
        )
        session.add(pago)

        # Reducir cupo
        instancia.cupo -= 1

        await session.commit()
        print(f"\n✓ Inscripción individual creada")
        print(f"  Monto: ${float(monto):.2f}")
        print(f"  Cupo restante: {instancia.cupo}")


if __name__ == "__main__":
    asyncio.run(convert_to_individual())
