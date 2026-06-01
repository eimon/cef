"""
Seeder minimo para demo/control de flujo.

Deja la base con:
  - 1 usuario admin       admin@cef.ar     / admin
  - 1 usuario cliente     cliente@cef.ar   / cliente123
  - 1 ficha medica basica para el cliente
  - 1 profesor
  - 1 sala
  - 1 clase individual historica inscripta para el cliente
  - 1 suscripcion historica para el cliente

Limpia los datos de clases/profesores/salas/usuarios de demo anteriores para
mantener el escenario chico y predecible. Las clases historicas quedan inactivas
para que no aparezcan como clases disponibles en el calendario.
"""

import asyncio
import os
import sys
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import delete
from sqlalchemy.future import select

from core.database import AsyncSessionLocal
from core.enums import DiaSemana, Disciplina, EstadoPago, TipoInscripcion, UserRole
from core.security import get_password_hash
from models.asistencia import Asistencia
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.email_change_token import EmailChangeToken
from models.ficha_medica import FichaMedica
from models.pagos import Pago
from models.password_reset_token import PasswordResetToken
from models.precio_disciplina import PrecioDisciplina
from models.profesor import Profesor
from models.refresh_token import RefreshToken
from models.registration_token import RegistrationToken
from models.sala import Sala
from models.suscripciones import Suscripcion
from models.usuario import Usuario

ADMIN_EMAIL = "admin@cef.ar"
CLIENT_EMAIL = "cliente@cef.ar"


async def _reset_demo_data(session) -> None:
    await session.execute(delete(Pago))
    await session.execute(delete(Asistencia))
    await session.execute(delete(Suscripcion))
    await session.execute(delete(ClaseInstancia))
    await session.execute(delete(ClaseTemplate))
    await session.execute(delete(Profesor))
    await session.execute(delete(Sala))
    await session.execute(delete(PrecioDisciplina))
    await session.execute(delete(FichaMedica))
    await session.execute(delete(RefreshToken))
    await session.execute(delete(RegistrationToken))
    await session.execute(delete(EmailChangeToken))
    await session.execute(delete(PasswordResetToken))
    await session.execute(delete(Usuario).where(Usuario.email.notin_([ADMIN_EMAIL, CLIENT_EMAIL])))
    await session.flush()


async def _upsert_admin(session) -> Usuario:
    admin = (await session.execute(
        select(Usuario).where(Usuario.email == ADMIN_EMAIL)
    )).scalars().first()

    if admin is None:
        admin = Usuario(email=ADMIN_EMAIL)
        session.add(admin)

    admin.telefono = "1100000001"
    admin.hashed_password = get_password_hash("admin")
    admin.nombre = "Administrador"
    admin.apellido = None
    admin.fecha_nacimiento = None
    admin.dni = None
    admin.genero = None
    admin.role = UserRole.ADMIN
    admin.activo = True
    admin.email_verified_at = datetime.now(timezone.utc)
    admin.registration_completed_at = datetime.now(timezone.utc)
    await session.flush()
    return admin


async def _upsert_cliente(session) -> Usuario:
    cliente = (await session.execute(
        select(Usuario).where(Usuario.email == CLIENT_EMAIL)
    )).scalars().first()

    if cliente is None:
        cliente = Usuario(email=CLIENT_EMAIL)
        session.add(cliente)

    cliente.telefono = "1100000002"
    cliente.hashed_password = get_password_hash("cliente123")
    cliente.nombre = "María"
    cliente.apellido = "García"
    cliente.fecha_nacimiento = date(1992, 5, 20)
    cliente.dni = "30123456"
    cliente.genero = None
    cliente.role = UserRole.CLIENTE
    cliente.activo = True
    cliente.email_verified_at = datetime.now(timezone.utc)
    cliente.registration_completed_at = datetime.now(timezone.utc)
    await session.flush()
    return cliente


async def _seed_ficha_medica(session, cliente: Usuario) -> None:
    session.add(FichaMedica(
        usuario_id=cliente.id,
        fecha=date.today(),
        cuerpo_ficha="""{
  "contacto_emergencia": {
    "nombre": "Contacto de prueba",
    "relacion": "Familiar",
    "telefono": "1100000099"
  },
  "antecedentes_medicos": {
    "afecciones": ["Ninguna"],
    "especifique_otros": ""
  },
  "informacion_adicional_salud": {
    "fuma_o_ha_fumado": "No",
    "consume_alcohol": "No",
    "mareos_falta_aire_o_dolor_pecho": "No",
    "horas_sueno_promedio": "8",
    "dificultad_para_dormir": "No",
    "dieta_especial_o_suplementacion": "No"
  },
  "historial_cirugias": [],
  "alergias_y_medicacion": {
    "alergias": "",
    "medicacion_actual": ""
  },
  "actividad_fisica_y_objetivos": {
    "realiza_actividad_fisica_actualmente": "Si",
    "frecuencia": "2 veces por semana",
    "objetivo_principal": ["Bienestar general"]
  },
  "consentimiento_y_declaracion_jurada": {
    "aceptado": true,
    "texto": "Ficha medica de prueba para seed minimo"
  }
}""",
    ))
    await session.flush()


async def _seed_precio_yoga(session) -> None:
    session.add(PrecioDisciplina(
        disciplina=Disciplina.YOGA,
        precio_individual=Decimal("1500.00"),
        precio_suscripcion=Decimal("1200.00"),
    ))
    await session.flush()


async def _seed_profesor(session) -> Profesor:
    profesor = Profesor(
        nombre="Carlos",
        apellido="Rodríguez",
        email="profesor@cef.ar",
        telefono="1100000003",
        dni="25987654",
        activo=True,
    )
    session.add(profesor)
    await session.flush()
    return profesor


async def _seed_sala(session) -> Sala:
    sala = Sala(
        nombre="Sala 1",
        capacidad=20,
        activo=True,
    )
    session.add(sala)
    await session.flush()
    return sala


def _previous_monday() -> date:
    today = date.today()
    current_monday = today - timedelta(days=today.weekday())
    return current_monday - timedelta(days=7)


def _dates_for_weekday(start: date, end: date, weekday: int) -> list[date]:
    first = start + timedelta(days=(weekday - start.weekday()) % 7)
    dates = []
    current = first
    while current <= end:
        dates.append(current)
        current += timedelta(days=7)
    return dates


async def _seed_clase_individual(
    session,
    cliente: Usuario,
    profesor: Profesor,
    sala: Sala,
) -> None:
    clase_fecha = _previous_monday()
    clase = ClaseTemplate(
        nombre="Yoga",
        descripcion="Clase individual de prueba",
        profesor_id=profesor.id,
        sala_id=sala.id,
        disciplina=Disciplina.YOGA,
        dia_semana=DiaSemana.LUNES,
        hora_inicio=time(9, 0),
        hora_fin=time(10, 0),
        capacidad_maxima=1,
        activo=False,
    )
    session.add(clase)
    await session.flush()

    instancia = ClaseInstancia(
        clase_template_id=clase.id,
        fecha=clase_fecha,
        cupo=0,
        activo=True,
    )
    session.add(instancia)
    await session.flush()

    asistencia = Asistencia(
        usuario_id=cliente.id,
        clase_instancia_id=instancia.id,
        tipo=TipoInscripcion.INDIVIDUAL,
        asistio=True,
        cancelo=False,
    )
    session.add(asistencia)

    session.add(Pago(
        usuario_id=cliente.id,
        clase_instancia_id=instancia.id,
        monto=Decimal("1500.00"),
        fecha_pago=datetime.now(timezone.utc),
        estado=EstadoPago.PAGADO,
        mp_payment_id="seed-minimal",
        descripcion="Pago individual seed minimo",
        activo=True,
    ))
    await session.flush()


async def _seed_suscripcion_pasada(
    session,
    cliente: Usuario,
    profesor: Profesor,
    sala: Sala,
) -> None:
    fecha_inicio = _previous_monday() - timedelta(days=28)
    fecha_fin = fecha_inicio + timedelta(days=27)

    clase = ClaseTemplate(
        nombre="Yoga mensual",
        descripcion="Suscripcion historica de prueba",
        profesor_id=profesor.id,
        sala_id=sala.id,
        disciplina=Disciplina.YOGA,
        dia_semana=DiaSemana.MARTES,
        hora_inicio=time(18, 0),
        hora_fin=time(19, 0),
        capacidad_maxima=1,
        activo=False,
    )
    session.add(clase)
    await session.flush()

    suscripcion = Suscripcion(
        usuario_id=cliente.id,
        clase_template_id=clase.id,
        monto=Decimal("4800.00"),
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        activo=False,
    )
    session.add(suscripcion)
    await session.flush()

    for fecha_clase in _dates_for_weekday(fecha_inicio, fecha_fin, 1):
        instancia = ClaseInstancia(
            clase_template_id=clase.id,
            fecha=fecha_clase,
            cupo=0,
            activo=True,
        )
        session.add(instancia)
        await session.flush()

        session.add(Asistencia(
            usuario_id=cliente.id,
            clase_instancia_id=instancia.id,
            tipo=TipoInscripcion.SUSCRIPCION,
            asistio=True,
            cancelo=False,
        ))

    session.add(Pago(
        usuario_id=cliente.id,
        suscripcion_id=suscripcion.id,
        monto=Decimal("4800.00"),
        fecha_pago=datetime.now(timezone.utc),
        estado=EstadoPago.PAGADO,
        mp_payment_id="seed-minimal-suscripcion",
        descripcion="Pago suscripcion historica seed minimo",
        activo=True,
    ))
    await session.flush()


async def seed_minimal() -> None:
    print("Iniciando seed minimo...")
    async with AsyncSessionLocal() as session:
        await _reset_demo_data(session)
        await _upsert_admin(session)
        cliente = await _upsert_cliente(session)
        await _seed_ficha_medica(session, cliente)
        await _seed_precio_yoga(session)
        profesor = await _seed_profesor(session)
        sala = await _seed_sala(session)
        await _seed_clase_individual(session, cliente, profesor, sala)
        await _seed_suscripcion_pasada(session, cliente, profesor, sala)
        await session.commit()
    print("Seed minimo listo.")


if __name__ == "__main__":
    asyncio.run(seed_minimal())
