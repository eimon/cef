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


async def _seed_profesor(session) -> Profesor:
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
    await session.flush()
    print("  [ok]   profesor")
    return profesor


async def _seed_sala(session) -> Sala:
    existe = (await session.execute(
        select(Sala).where(Sala.nombre == "Sala Principal")
    )).scalars().first()
    if existe:
        print("  [skip] sala")
        return existe
    sala = Sala(
        nombre="Sala Principal",
        capacidad=20,
    )
    session.add(sala)
    await session.flush()
    print("  [ok]   sala")
    return sala


async def _seed_clases(session, profesor: Profesor, sala: Sala) -> None:
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
        session.add(ClaseTemplate(profesor_id=profesor.id, sala_id=sala.id, **data))
        print(f"  [ok]   clase '{data['nombre']}'")


async def _seed_instancias(session) -> None:
    """Create future ClaseInstancia records for testing individual enrollment."""
    templates = (await session.execute(select(ClaseTemplate))).scalars().all()
    today = date.today()
    # Create instances for the next 4 weeks
    for template in templates:
        for weeks_ahead in range(1, 5):
            # Find next occurrence of this day of week
            dia_offset = {
                DiaSemana.LUNES: 0, DiaSemana.MARTES: 1, DiaSemana.MIERCOLES: 2,
                DiaSemana.JUEVES: 3, DiaSemana.VIERNES: 4, DiaSemana.SABADO: 5,
                DiaSemana.DOMINGO: 6,
            }[template.dia_semana]
            monday = today - timedelta(days=today.weekday()) + timedelta(weeks=weeks_ahead)
            fecha = monday + timedelta(days=dia_offset)

            existe = (await session.execute(
                select(ClaseInstancia).where(
                    ClaseInstancia.clase_template_id == template.id,
                    ClaseInstancia.fecha == fecha,
                )
            )).scalars().first()
            if existe:
                print(f"  [skip] instancia '{template.nombre}' {fecha}")
                continue
            session.add(ClaseInstancia(
                clase_template_id=template.id,
                fecha=fecha,
                cupo=template.capacidad_maxima,
                cupo_oculto=5,
            ))
            print(f"  [ok]   instancia '{template.nombre}' {fecha}")


async def seed_dev() -> None:
    print("Iniciando seed de desarrollo...")
    async with AsyncSessionLocal() as session:
        await _seed_admin(session)
        await _seed_cliente(session)
        profesor = await _seed_profesor(session)
        sala = await _seed_sala(session)
        await _seed_clases(session, profesor, sala)
        await _seed_instancias(session)
        await session.commit()
    print("Listo.")


if __name__ == "__main__":
    asyncio.run(seed_dev())
