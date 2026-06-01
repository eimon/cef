"""
Seeder de desarrollo - datos base para trabajar en paralelo.

Crea (idempotente):
  - 1 usuario admin       admin@cef.ar     / admin
  - 3 usuarios cliente
  - 3 profesores
  - 3 salas
  - 3 precios por disciplina
  - 3 templates de clase
"""

import asyncio
import os
import sys
from datetime import date, datetime, time, timezone
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select

from core.database import AsyncSessionLocal
from core.enums import DiaSemana, Disciplina, EstadoPago, TipoInscripcion, UserRole
from core.security import get_password_hash
from models.asistencia import Asistencia
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.pagos import Pago
from models.precio_disciplina import PrecioDisciplina
from models.profesor import Profesor
from models.sala import Sala
from models.usuario import Usuario


async def _seed_admin(session) -> None:
    existe = (await session.execute(
        select(Usuario).where(Usuario.email == "admin@cef.ar")
    )).scalars().first()
    if existe:
        print("  [skip] admin")
        return
    session.add(Usuario(
        email="admin@cef.ar",
        telefono="1100000001",
        hashed_password=get_password_hash("admin"),
        nombre="Administrador",
        role=UserRole.ADMIN,
    ))
    print("  [ok]   admin")


async def _seed_cliente(session) -> None:
    clientes = [
        {
            "email": "cliente@cef.ar",
            "telefono": "1100000002",
            "password": "cliente123",
            "nombre": "María",
            "apellido": "García",
            "fecha_nacimiento": date(1992, 5, 20),
            "dni": "30123456",
        },
        {
            "email": "cliente2@cef.ar",
            "telefono": "1100000006",
            "password": "cliente123",
            "nombre": "Lucía",
            "apellido": "Fernández",
            "fecha_nacimiento": date(1994, 8, 12),
            "dni": "32123456",
        },
        {
            "email": "cliente3@cef.ar",
            "telefono": "1100000007",
            "password": "cliente123",
            "nombre": "Joaquín",
            "apellido": "López",
            "fecha_nacimiento": date(1989, 11, 3),
            "dni": "28123456",
        },
    ]

    for i, data in enumerate(clientes, 1):
        existe = (await session.execute(
            select(Usuario).where(Usuario.email == data["email"])
        )).scalars().first()
        if existe:
            print(f"  [skip] cliente {i}")
            continue
        session.add(Usuario(
            email=data["email"],
            telefono=data["telefono"],
            hashed_password=get_password_hash(data["password"]),
            nombre=data["nombre"],
            apellido=data["apellido"],
            fecha_nacimiento=data["fecha_nacimiento"],
            dni=data["dni"],
            role=UserRole.CLIENTE,
        ))
        print(f"  [ok]   cliente {i}")


async def _seed_profesores(session) -> list[Profesor]:
    datos = [
        {"nombre": "Carlos", "apellido": "Rodríguez", "email": "profesor@cef.ar", "telefono": "1100000003", "dni": "25987654"},
        {"nombre": "Ana", "apellido": "Pérez", "email": "profesor2@cef.ar", "telefono": "1100000004", "dni": "25987655"},
        {"nombre": "Luis", "apellido": "Martínez", "email": "profesor3@cef.ar", "telefono": "1100000005", "dni": "25987656"},
    ]
    profesores = []
    for i, data in enumerate(datos, 1):
        existe = (await session.execute(
            select(Profesor).where(Profesor.email == data["email"])
        )).scalars().first()
        if existe:
            print(f"  [skip] profesor {i}")
            profesores.append(existe)
        else:
            profesor = Profesor(**data)
            session.add(profesor)
            profesores.append(profesor)
            print(f"  [ok]   profesor {i}")
    await session.flush()
    return profesores


async def _seed_salas(session) -> list[Sala]:
    salas = []
    for i in range(1, 4):
        nombre = f"Sala {i}"
        existe = (await session.execute(
            select(Sala).where(Sala.nombre == nombre)
        )).scalars().first()
        if existe:
            print(f"  [skip] {nombre}")
            salas.append(existe)
        else:
            sala = Sala(nombre=nombre, capacidad=20)
            session.add(sala)
            salas.append(sala)
            print(f"  [ok]   {nombre}")
    await session.flush()
    return salas


async def _seed_precios(session) -> None:
    precios = [
        {"disciplina": Disciplina.YOGA, "precio_individual": 1500, "precio_suscripcion": 1200},
        {"disciplina": Disciplina.PILATES, "precio_individual": 1500, "precio_suscripcion": 1200},
        {"disciplina": Disciplina.FUNCIONAL, "precio_individual": 1800, "precio_suscripcion": 1400},
    ]
    for data in precios:
        existe = (await session.execute(
            select(PrecioDisciplina).where(PrecioDisciplina.disciplina == data["disciplina"])
        )).scalars().first()
        if existe:
            print(f"  [skip] precio {data['disciplina'].value}")
        else:
            session.add(PrecioDisciplina(**data))
            print(f"  [ok]   precio {data['disciplina'].value}")
    await session.flush()


async def _seed_clases(session, profesores: list[Profesor], salas: list[Sala]) -> None:
    async def upsert_clase(data: dict, profesor: Profesor, sala: Sala) -> ClaseTemplate:
        clase = (await session.execute(
            select(ClaseTemplate).where(
                ClaseTemplate.nombre == data["nombre"],
                ClaseTemplate.dia_semana == data["dia_semana"],
                ClaseTemplate.hora_inicio == data["hora_inicio"],
            )
        )).scalars().first()

        if clase is None:
            clase = ClaseTemplate(
                profesor_id=profesor.id,
                sala_id=sala.id,
                **data,
            )
            session.add(clase)
            print(f"  [ok]   clase '{data['nombre']}'")
        else:
            clase.profesor_id = profesor.id
            clase.sala_id = sala.id
            clase.descripcion = data["descripcion"]
            clase.disciplina = data["disciplina"]
            clase.hora_fin = data["hora_fin"]
            clase.capacidad_maxima = data["capacidad_maxima"]
            clase.activo = True
            print(f"  [update] clase '{data['nombre']}'")

        await session.flush()
        return clase

    clases = [
        {
            "nombre": "Yoga",
            "descripcion": "Clase de yoga para todos los niveles",
            "disciplina": Disciplina.YOGA,
            "dia_semana": DiaSemana.MARTES,
            "hora_inicio": time(9, 0),
            "hora_fin": time(10, 0),
            "capacidad_maxima": 15,
        },
        {
            "nombre": "Funcional",
            "descripcion": "Entrenamiento funcional de alta intensidad",
            "disciplina": Disciplina.FUNCIONAL,
            "dia_semana": DiaSemana.MIERCOLES,
            "hora_inicio": time(18, 0),
            "hora_fin": time(19, 0),
            "capacidad_maxima": 20,
        },
        {
            "nombre": "Pilates",
            "descripcion": "Pilates mat para fortalecimiento y flexibilidad",
            "disciplina": Disciplina.PILATES,
            "dia_semana": DiaSemana.VIERNES,
            "hora_inicio": time(10, 0),
            "hora_fin": time(11, 0),
            "capacidad_maxima": 12,
        },
    ]
    for i, data in enumerate(clases):
        await upsert_clase(data, profesores[i], salas[i])

    pilates_lunes = await upsert_clase(
        {
            "nombre": "Pilates",
            "descripcion": "Pilates con cupo reducido para probar lista de espera",
            "disciplina": Disciplina.PILATES,
            "dia_semana": DiaSemana.MARTES,
            "hora_inicio": time(9, 0),
            "hora_fin": time(10, 0),
            "capacidad_maxima": 1,
        },
        profesores[1],
        salas[1],
    )

    await upsert_clase(
        {
            "nombre": "Funcional",
            "descripcion": "Clase de prueba de los viernes",
            "disciplina": Disciplina.FUNCIONAL,
            "dia_semana": DiaSemana.VIERNES,
            "hora_inicio": time(10, 0),
            "hora_fin": time(11, 0),
            "capacidad_maxima": 10,
        },
        profesores[0],
        salas[0],
    )

    await _seed_pilates_lunes_inscripto(session, pilates_lunes)


async def _seed_pilates_lunes_inscripto(session, clase: ClaseTemplate) -> None:
    usuario = (await session.execute(
        select(Usuario).where(Usuario.email == "cliente2@cef.ar")
    )).scalars().first()
    if not usuario:
        print("  [skip] inscripcion pilates lunes: falta cliente2@cef.ar")
        return

    fecha_clase = date(2026, 6, 8)
    instancia = (await session.execute(
        select(ClaseInstancia).where(
            ClaseInstancia.clase_template_id == clase.id,
            ClaseInstancia.fecha == fecha_clase,
        )
    )).scalars().first()

    if instancia is None:
        instancia = ClaseInstancia(
            clase_template_id=clase.id,
            fecha=fecha_clase,
            cupo=0,
            activo=True,
        )
        session.add(instancia)
        await session.flush()
        print("  [ok]   instancia Pilates 2026-06-08")
    else:
        instancia.cupo = 0
        instancia.activo = True
        instancia.cancelada = False
        instancia.motivo_cancelacion = None
        print("  [update] instancia Pilates 2026-06-08")

    asistencia = (await session.execute(
        select(Asistencia).where(
            Asistencia.usuario_id == usuario.id,
            Asistencia.clase_instancia_id == instancia.id,
        )
    )).scalars().first()
    if asistencia is None:
        session.add(Asistencia(
            usuario_id=usuario.id,
            clase_instancia_id=instancia.id,
            tipo=TipoInscripcion.INDIVIDUAL,
            asistio=False,
            cancelo=False,
        ))
        print("  [ok]   inscripcion Pilates 2026-06-08")
    else:
        asistencia.tipo = TipoInscripcion.INDIVIDUAL
        asistencia.asistio = False
        asistencia.cancelo = False
        print("  [update] inscripcion Pilates 2026-06-08")

    pago = (await session.execute(
        select(Pago).where(
            Pago.usuario_id == usuario.id,
            Pago.clase_instancia_id == instancia.id,
            Pago.mp_payment_id == "seed-dev-pilates-lunes-2026-06-08",
        )
    )).scalars().first()
    if pago is None:
        session.add(Pago(
            usuario_id=usuario.id,
            clase_instancia_id=instancia.id,
            monto=Decimal("1500.00"),
            fecha_pago=datetime.now(timezone.utc),
            estado=EstadoPago.PAGADO,
            mp_payment_id="seed-dev-pilates-lunes-2026-06-08",
            descripcion="Pago individual seed Pilates lunes 2026-06-08",
            activo=True,
        ))
        print("  [ok]   pago Pilates 2026-06-08")


async def seed_dev() -> None:
    print("Iniciando seed de desarrollo...")
    async with AsyncSessionLocal() as session:
        await _seed_admin(session)
        await _seed_cliente(session)
        profesores = await _seed_profesores(session)
        salas = await _seed_salas(session)
        await _seed_precios(session)
        await _seed_clases(session, profesores, salas)
        await session.commit()
    print("Listo.")


if __name__ == "__main__":
    asyncio.run(seed_dev())
