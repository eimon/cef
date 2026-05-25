"""
Seeder de desarrollo — datos base para trabajar en paralelo.

Crea (idempotente):
  - 1 usuario admin       admin@cef.ar     / admin
  - 1 usuario cliente     cliente@cef.ar   / cliente123
  - 1 profesor
  - 1 sala
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
from models.clase_instancia import ClaseInstancia
from models.suscripciones import Suscripcion


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


async def _seed_profesor(session) -> list[Profesor]:
    profesores = []
    existe = (await session.execute(
        select(Profesor).where(Profesor.email == "profesor@cef.ar")
    )).scalars().first()
    if existe:
        print("  [skip] profesor")
        return existe
    profesor = Profesor(
        nombre="Carlos",
        apellido="Rodríguez",
        email="profesor@cef.ar",
        telefono="1100000003",
        dni="25987654",
    )
    session.add(profesor)
    profesores.append(profesor)
    
    print("  [ok]   profesor 1")
    existe = (await session.execute(
        select(Profesor).where(Profesor.email == "profesor2@cef.ar")
    )).scalars().first()
    if existe:
        print("  [skip] profesor")
        return existe
    profesor = Profesor(
        nombre="Ana",
        apellido="Pérez",
        email="profesor2@cef.ar",
        telefono="1100000004",
        dni="25987655",
    )
    session.add(profesor)
    profesores.append(profesor)
    print("  [ok]   profesor 2")
    existe = (await session.execute(
        select(Profesor).where(Profesor.email == "profesor3@cef.ar")
    )).scalars().first()
    if existe:
        print("  [skip] profesor")
        return existe
    profesor = Profesor(
        nombre="Luis",
        apellido="Martínez",
        email="profesor3@cef.ar",
        telefono="1100000005",
        dni="25987656",
    )
    session.add(profesor)
    profesores.append(profesor)
    await session.flush()
    print("  [ok]   profesor 3")
    return profesores


async def _seed_sala(session) -> list[Sala]:
    salas = []
    existe = (await session.execute(
        select(Sala).where(Sala.nombre == "Sala 1")
    )).scalars().first()
    if existe:
        print("  [skip] sala")
        return existe
    sala = Sala(
        nombre="Sala 1",
        capacidad=20,
    )
    session.add(sala)
    salas.append(sala)
    existe = (await session.execute(
        select(Sala).where(Sala.nombre == "Sala 2")
    )).scalars().first()
    if existe:
        print("  [skip] sala")
        return existe
    sala = Sala(
        nombre="Sala 2",
        capacidad=20,
    )
    session.add(sala)
    salas.append(sala)
    existe = (await session.execute(
        select(Sala).where(Sala.nombre == "Sala 3")
    )).scalars().first()
    if existe:
        print("  [skip] sala")
        return existe
    sala = Sala(
        nombre="Sala 3",
        capacidad=20,
    )
    session.add(sala)
    salas.append(sala)
    await session.flush()
    print("  [ok]   sala")
    return salas


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
            "precio_individual": 1500,
            "precio_suscripcion": 1200,
        },
        {
            "nombre": "Funcional",
            "descripcion": "Entrenamiento funcional de alta intensidad",
            "disciplina": Disciplina.FUNCIONAL,
            "dia_semana": DiaSemana.MIERCOLES,
            "hora_inicio": time(18, 0),
            "hora_fin": time(19, 0),
            "capacidad_maxima": 20,
            "precio_individual": 1800,
            "precio_suscripcion": 1400,
        },
        {
            "nombre": "Pilates",
            "descripcion": "Pilates mat para fortalecimiento y flexibilidad",
            "disciplina": Disciplina.PILATES,
            "dia_semana": DiaSemana.VIERNES,
            "hora_inicio": time(10, 0),
            "hora_fin": time(11, 0),
            "capacidad_maxima": 12,
            "precio_individual": 1500,
            "precio_suscripcion": 1200,
        },
    ]
    i = 0
    for data in clases:
        existe = (await session.execute(
            select(ClaseTemplate).where(
                ClaseTemplate.nombre == data["nombre"],
                ClaseTemplate.dia_semana == data["dia_semana"],
            )
        )).scalars().first()
        if existe:
            if existe.disciplina != data["disciplina"]:
                existe.disciplina = data["disciplina"]
                print(f"  [upd]  clase '{data['nombre']}' — disciplina actualizada")
            else:
                print(f"  [skip] clase '{data['nombre']}'")
            continue
        session.add(ClaseTemplate(profesor_id=profesores[i].id, sala_id=salas[i].id, **data))
        i += 1
        print(f"  [ok]   clase '{data['nombre']}'")

async def seed_dev() -> None:
    print("Iniciando seed de desarrollo...")
    async with AsyncSessionLocal() as session:
        await _seed_admin(session)
        await _seed_cliente(session)
        profesor = await _seed_profesor(session)
        salas = await _seed_sala(session)
        await _seed_clases(session, profesor, salas)
        # await _seed_instancias(session)
        # await _seed_suscripciones(session)
        await session.commit()
    print("Listo.")


if __name__ == "__main__":
    asyncio.run(seed_dev())
