"""
Seeder de desarrollo — datos base para trabajar en paralelo.

Crea (idempotente):
  - 1 usuario admin       admin@cef.ar     / admin
  - 1 usuario cliente     cliente@cef.ar   / cliente123
  - 3 profesores
  - 3 salas
  - 3 precios por disciplina
  - 3 templates de clase
"""

import asyncio
import sys
import os
from datetime import time, date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select
from core.database import AsyncSessionLocal
from core.enums import UserRole, DiaSemana, Disciplina
from core.security import get_password_hash
from models.usuario import Usuario
from models.profesor import Profesor
from models.sala import Sala
from models.clase_template import ClaseTemplate
from models.precio_disciplina import PrecioDisciplina


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
    existe = (await session.execute(
        select(Usuario).where(Usuario.email == "cliente@cef.ar")
    )).scalars().first()
    if existe:
        print("  [skip] cliente")
        return
    session.add(Usuario(
        email="cliente@cef.ar",
        telefono="1100000002",
        hashed_password=get_password_hash("cliente123"),
        nombre="María",
        apellido="García",
        fecha_nacimiento=date(1992, 5, 20),
        dni="30123456",
        role=UserRole.CLIENTE,
    ))
    print("  [ok]   cliente")


async def _seed_profesores(session) -> list[Profesor]:
    datos = [
        {"nombre": "Carlos", "apellido": "Rodríguez", "email": "profesor@cef.ar", "telefono": "1100000003", "dni": "25987654"},
        {"nombre": "Ana", "apellido": "Pérez", "email": "profesor2@cef.ar", "telefono": "1100000004", "dni": "25987655"},
        {"nombre": "Luis", "apellido": "Martínez", "email": "profesor3@cef.ar", "telefono": "1100000005", "dni": "25987656"},
    ]
    profesores = []
    for i, d in enumerate(datos, 1):
        existe = (await session.execute(
            select(Profesor).where(Profesor.email == d["email"])
        )).scalars().first()
        if existe:
            print(f"  [skip] profesor {i}")
            profesores.append(existe)
        else:
            p = Profesor(**d)
            session.add(p)
            profesores.append(p)
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
            s = Sala(nombre=nombre, capacidad=20)
            session.add(s)
            salas.append(s)
            print(f"  [ok]   {nombre}")
    await session.flush()
    return salas


async def _seed_precios(session) -> None:
    precios = [
        {"disciplina": Disciplina.YOGA, "precio_individual": 1500, "precio_suscripcion": 1200},
        {"disciplina": Disciplina.PILATES, "precio_individual": 1500, "precio_suscripcion": 1200},
        {"disciplina": Disciplina.FUNCIONAL, "precio_individual": 1800, "precio_suscripcion": 1400},
    ]
    for d in precios:
        existe = (await session.execute(
            select(PrecioDisciplina).where(PrecioDisciplina.disciplina == d["disciplina"])
        )).scalars().first()
        if existe:
            print(f"  [skip] precio {d['disciplina'].value}")
        else:
            session.add(PrecioDisciplina(**d))
            print(f"  [ok]   precio {d['disciplina'].value}")
    await session.flush()


async def _seed_clases(session, profesores: list[Profesor], salas: list[Sala]) -> None:
    clases = [
        {
            "nombre": "Yoga",
            "descripcion": "Clase de yoga para todos los niveles",
            "disciplina": Disciplina.YOGA,
            "dia_semana": DiaSemana.LUNES,
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
        existe = (await session.execute(
            select(ClaseTemplate).where(
                ClaseTemplate.nombre == data["nombre"],
                ClaseTemplate.dia_semana == data["dia_semana"],
            )
        )).scalars().first()
        if existe:
            print(f"  [skip] clase '{data['nombre']}'")
            continue
        session.add(ClaseTemplate(
            profesor_id=profesores[i].id,
            sala_id=salas[i].id,
            **data,
        ))
        print(f"  [ok]   clase '{data['nombre']}'")


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
