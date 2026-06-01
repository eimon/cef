"""
Script para cambiar inscripción a Pilates martes 15:00 del 9/6
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
from core.enums import TipoInscripcion, EstadoPago, DiaSemana, Disciplina
from models.usuario import Usuario
from models.asistencia import Asistencia
from models.pagos import Pago
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.precio_disciplina import PrecioDisciplina


async def fix_inscripcion_martes():
    """Cambia la inscripción a Pilates martes 15:00"""
    async with AsyncSessionLocal() as session:
        # Buscar cliente@cef.ar
        cliente = (await session.execute(
            select(Usuario).where(Usuario.email == "cliente@cef.ar")
        )).scalars().first()

        if not cliente:
            print("❌ cliente@cef.ar no encontrado")
            return

        # Eliminar asistencia anterior (Funcional 9/6)
        asistencias_old = (await session.execute(
            select(Asistencia).where(
                Asistencia.usuario_id == cliente.id,
                Asistencia.tipo == TipoInscripcion.INDIVIDUAL,
                Asistencia.cancelo == False
            )
        )).scalars().all()

        print(f"Removiendo {len(asistencias_old)} asistencia(s) anterior(es)...")
        for asist in asistencias_old:
            # Recuperar el cupo
            instancia = (await session.execute(
                select(ClaseInstancia).where(ClaseInstancia.id == asist.clase_instancia_id)
            )).scalars().first()
            instancia.cupo += 1
            
            asist.cancelo = True
            print(f"  [ok] Cancelada")

        # Eliminar pagos anteriores
        pagos_old = (await session.execute(
            select(Pago).where(
                Pago.usuario_id == cliente.id,
                Pago.suscripcion_id == None,
                Pago.activo == True
            )
        )).scalars().all()

        print(f"Eliminando {len(pagos_old)} pago(s) anterior(es)...")
        for pago in pagos_old:
            pago.activo = False
            print(f"  [ok] Pago desactivado")

        # Buscar la clase Pilates martes template
        from datetime import time
        
        pilates_template = (await session.execute(
            select(ClaseTemplate).where(
                ClaseTemplate.nombre == "Pilates",
                ClaseTemplate.dia_semana == DiaSemana.MARTES,
                ClaseTemplate.hora_inicio == time(15, 0)
            )
        )).scalars().first()

        if not pilates_template:
            print("❌ Clase Pilates martes 15:00 no encontrada")
            return

        print(f"\n✓ Clase encontrada: {pilates_template.nombre}")
        print(f"  Hora: {pilates_template.hora_inicio}")

        # Buscar o crear instancia para 9/6 (martes)
        fecha_9_6 = date(2026, 6, 9)
        instancia = (await session.execute(
            select(ClaseInstancia).where(
                ClaseInstancia.clase_template_id == pilates_template.id,
                ClaseInstancia.fecha == fecha_9_6
            )
        )).scalars().first()

        if not instancia:
            print(f"Creando instancia para {fecha_9_6}...")
            instancia = ClaseInstancia(
                clase_template_id=pilates_template.id,
                fecha=fecha_9_6,
                cupo=pilates_template.capacidad_maxima,
                activo=True
            )
            session.add(instancia)
            await session.flush()
        else:
            print(f"✓ Instancia ya existe para {fecha_9_6}")

        # Obtener precio
        precio = (await session.execute(
            select(PrecioDisciplina).where(
                PrecioDisciplina.disciplina == pilates_template.disciplina
            )
        )).scalars().first()

        monto = precio.precio_individual if precio else Decimal("1500")

        # Crear nueva Asistencia
        asistencia = Asistencia(
            usuario_id=cliente.id,
            clase_instancia_id=instancia.id,
            tipo=TipoInscripcion.INDIVIDUAL,
            asistio=True,
            cancelo=False
        )
        session.add(asistencia)
        await session.flush()

        # Crear nuevo Pago
        pago = Pago(
            usuario_id=cliente.id,
            clase_instancia_id=instancia.id,
            suscripcion_id=None,
            monto=monto,
            fecha_pago=datetime.now(LOCAL_TZ),
            estado=EstadoPago.PAGADO,
            descripcion=f"Inscripción individual a {pilates_template.nombre} del {fecha_9_6}",
            activo=True
        )
        session.add(pago)

        # Reducir cupo
        instancia.cupo -= 1

        await session.commit()
        print(f"\n✓ Nueva inscripción creada:")
        print(f"  Clase: {pilates_template.nombre}")
        print(f"  Fecha: {fecha_9_6} (martes)")
        print(f"  Hora: {pilates_template.hora_inicio}-{pilates_template.hora_fin}")
        print(f"  Monto: ${float(monto):.2f}")


if __name__ == "__main__":
    asyncio.run(fix_inscripcion_martes())
