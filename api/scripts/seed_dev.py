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
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select

from core.database import AsyncSessionLocal
from core.enums import DiaSemana, EstadoPago, EstadoSuscripcion, TipoInscripcion, UserRole
from core.security import get_password_hash
from models.asistencia import Asistencia
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.cupon_descuento import CuponDescuento
from models.ficha_medica import FichaMedica
from models.pagos import Pago
from models.disciplina import Disciplina as DisciplinaModel
from models.profesor import Profesor
from models.sala import Sala
from models.suscripciones import Suscripcion, SuscripcionReserva
from models.usuario import Usuario


WEEKDAY_INDEX_BY_DIA_SEMANA = {
    DiaSemana.LUNES: 0,
    DiaSemana.MARTES: 1,
    DiaSemana.MIERCOLES: 2,
    DiaSemana.JUEVES: 3,
    DiaSemana.VIERNES: 4,
    DiaSemana.SABADO: 5,
    DiaSemana.DOMINGO: 6,
}


def _first_weekday_on_or_after(start_date: date, dia_semana: DiaSemana) -> date:
    weekday = WEEKDAY_INDEX_BY_DIA_SEMANA[dia_semana]
    days_until = (weekday - start_date.weekday()) % 7
    return start_date + timedelta(days=days_until)


def _next_weekday_at_least(start_date: date, dia_semana: DiaSemana, min_days: int = 2) -> date:
    weekday = WEEKDAY_INDEX_BY_DIA_SEMANA[dia_semana]
    days_until = (weekday - start_date.weekday()) % 7
    if days_until < min_days:
        days_until += 7
    return start_date + timedelta(days=days_until)


def _previous_weekday_before(start_date: date, dia_semana: DiaSemana) -> date:
    weekday = WEEKDAY_INDEX_BY_DIA_SEMANA[dia_semana]
    days_since = (start_date.weekday() - weekday) % 7
    if days_since == 0:
        days_since = 7
    return start_date - timedelta(days=days_since)


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
        dni="11111111",
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
        {
            "email": "cliente4@cef.ar",
            "telefono": "1100000008",
            "password": "cliente123",
            "nombre": "Laura",
            "apellido": "Sánchez",
            "fecha_nacimiento": date(1996, 3, 15),
            "dni": "40123456",
        },
        {
            "email": "cliente_abril@cef.ar",
            "telefono": "1100000009",
            "password": "cliente123",
            "nombre": "Sofia",
            "apellido": "Ruiz",
            "fecha_nacimiento": date(1991, 4, 8),
            "dni": "35123456",
            "created_at": datetime(2026, 4, 10, 10, 0, 0, tzinfo=timezone.utc),
        },
    ]

    for i, data in enumerate(clientes, 1):
        cliente = (await session.execute(
            select(Usuario).where(Usuario.email == data["email"])
        )).scalars().first()
        if cliente is None:
            cliente = Usuario(email=data["email"])
            session.add(cliente)
            print(f"  [ok]   cliente {i}")
        else:
            print(f"  [update] cliente {i}")

        cliente.telefono = data["telefono"]
        cliente.hashed_password = get_password_hash(data["password"])
        cliente.nombre = data["nombre"]
        cliente.apellido = data["apellido"]
        cliente.fecha_nacimiento = data["fecha_nacimiento"]
        cliente.dni = data["dni"]
        cliente.role = UserRole.CLIENTE
        cliente.activo = True
        if data.get("created_at"):
            cliente.created_at = data["created_at"]
        cliente.email_verified_at = cliente.email_verified_at or datetime.now(timezone.utc)
        cliente.registration_completed_at = cliente.registration_completed_at or datetime.now(timezone.utc)
    await session.flush()


async def _seed_personal_abril(session) -> None:
    email = "personal_abril@cef.ar"
    personal = (await session.execute(
        select(Usuario).where(Usuario.email == email)
    )).scalars().first()

    if personal is None:
        personal = Usuario(email=email)
        session.add(personal)
        print("  [ok]   personal abril")
    else:
        print("  [update] personal abril")

    personal.telefono = "1100000010"
    personal.hashed_password = get_password_hash("personal123")
    personal.nombre = "Martin"
    personal.apellido = "Silva"
    personal.fecha_nacimiento = date(1988, 9, 14)
    personal.dni = "27123456"
    personal.role = UserRole.RECEPCION
    personal.activo = True
    personal.created_at = datetime(2026, 4, 12, 11, 0, 0, tzinfo=timezone.utc)
    personal.email_verified_at = personal.email_verified_at or datetime(2026, 4, 12, 11, 5, 0, tzinfo=timezone.utc)
    personal.registration_completed_at = personal.registration_completed_at or datetime(2026, 4, 12, 11, 10, 0, tzinfo=timezone.utc)
    await session.flush()


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
        {"nombre": "yoga", "precio_individual": 1500, "precio_suscripcion": 1200},
        {"nombre": "pilates", "precio_individual": 1500, "precio_suscripcion": 1200},
        {"nombre": "funcional", "precio_individual": 1800, "precio_suscripcion": 1400},
    ]
    for data in precios:
        disciplina = (await session.execute(
            select(DisciplinaModel).where(DisciplinaModel.nombre == data["nombre"])
        )).scalars().first()
        if disciplina:
            disciplina.precio_individual = data["precio_individual"]
            disciplina.precio_suscripcion = data["precio_suscripcion"]
            print(f"  [update] precio {data['nombre']}")
        else:
            session.add(DisciplinaModel(**data, activo=True))
            print(f"  [ok]   precio {data['nombre']}")
    await session.flush()


async def _get_cliente_principal(session) -> Usuario | None:
    return (await session.execute(
        select(Usuario).where(Usuario.email == "cliente@cef.ar")
    )).scalars().first()


async def _seed_ficha_medica_cliente(session) -> None:
    cliente = await _get_cliente_principal(session)
    if not cliente:
        print("  [skip] ficha medica cliente: falta cliente@cef.ar")
        return

    cuerpo_ficha = """{
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
    "texto": "Ficha medica de prueba para seed dev"
  }
}"""

    ficha = (await session.execute(
        select(FichaMedica).where(FichaMedica.usuario_id == cliente.id)
    )).scalars().first()
    if ficha is None:
        session.add(FichaMedica(
            usuario_id=cliente.id,
            fecha=date.today(),
            cuerpo_ficha=cuerpo_ficha,
        ))
        print("  [ok]   ficha medica cliente")
    else:
        ficha.cuerpo_ficha = cuerpo_ficha
        print("  [update] ficha medica cliente")
    await session.flush()


async def _upsert_clase_historica(
    session,
    *,
    nombre: str = "Yoga",
    disciplina: str = "yoga",
    descripcion: str,
    dia_semana: DiaSemana,
    hora_inicio: time,
    hora_fin: time,
    profesor: Profesor,
    sala: Sala,
) -> ClaseTemplate:
    clase = (await session.execute(
        select(ClaseTemplate).where(
            ClaseTemplate.nombre == nombre,
            ClaseTemplate.descripcion == descripcion,
            ClaseTemplate.dia_semana == dia_semana,
            ClaseTemplate.hora_inicio == hora_inicio,
        )
    )).scalars().first()

    if clase is None:
        clase = ClaseTemplate(
            nombre=nombre,
            descripcion=descripcion,
            profesor_id=profesor.id,
            sala_id=sala.id,
            disciplina=disciplina,
            dia_semana=dia_semana,
            hora_inicio=hora_inicio,
            hora_fin=hora_fin,
            capacidad_maxima=1,
            activo=False,
        )
        session.add(clase)
        print(f"  [ok]   clase historica '{descripcion}'")
    else:
        clase.profesor_id = profesor.id
        clase.sala_id = sala.id
        clase.hora_fin = hora_fin
        clase.capacidad_maxima = 1
        clase.activo = False
        print(f"  [update] clase historica '{descripcion}'")
    await session.flush()
    return clase


async def _seed_yoga_lunes_individual_pasada(
    session,
    profesor: Profesor,
    sala: Sala,
) -> None:
    cliente = await _get_cliente_principal(session)
    if not cliente:
        print("  [skip] individual historica: falta cliente@cef.ar")
        return

    clase = await _upsert_clase_historica(
        session,
        descripcion="Clase individual de prueba",
        dia_semana=DiaSemana.LUNES,
        hora_inicio=time(9, 0),
        hora_fin=time(10, 0),
        profesor=profesor,
        sala=sala,
    )
    fecha_clase = date(2026, 5, 25)

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
        print("  [ok]   instancia Yoga historica 2026-05-25")
    else:
        instancia.cupo = 0
        instancia.activo = True
        instancia.cancelada = False
        instancia.motivo_cancelacion = None
        print("  [update] instancia Yoga historica 2026-05-25")

    asistencia = (await session.execute(
        select(Asistencia).where(
            Asistencia.usuario_id == cliente.id,
            Asistencia.clase_instancia_id == instancia.id,
        )
    )).scalars().first()
    if asistencia is None:
        session.add(Asistencia(
            usuario_id=cliente.id,
            clase_instancia_id=instancia.id,
            tipo=TipoInscripcion.INDIVIDUAL,
            asistio=True,
            cancelo=False,
        ))
        print("  [ok]   individual historica Yoga 2026-05-25")
    else:
        asistencia.tipo = TipoInscripcion.INDIVIDUAL
        asistencia.asistio = True
        asistencia.cancelo = False
        print("  [update] individual historica Yoga 2026-05-25")

    pago = (await session.execute(
        select(Pago).where(Pago.mp_payment_id == "seed-dev-yoga-historica-individual")
    )).scalars().first()
    if pago is None:
        pago = (await session.execute(
            select(Pago).where(Pago.mp_payment_id == "seed-minimal")
        )).scalars().first()

    if pago is None:
        session.add(Pago(
            usuario_id=cliente.id,
            clase_instancia_id=instancia.id,
            monto=Decimal("1500.00"),
            fecha_pago=datetime.now(timezone.utc),
            estado=EstadoPago.PAGADO,
            mp_payment_id="seed-dev-yoga-historica-individual",
            descripcion="Pago individual historico seed dev",
            activo=True,
        ))
        print("  [ok]   pago individual historico Yoga 2026-05-25")
    else:
        pago.usuario_id = cliente.id
        pago.clase_instancia_id = instancia.id
        pago.monto = Decimal("1500.00")
        pago.estado = EstadoPago.PAGADO
        pago.activo = True
        pago.mp_payment_id = "seed-dev-yoga-historica-individual"
        pago.descripcion = "Pago individual historico seed dev"
        print("  [update] pago individual historico Yoga 2026-05-25")


async def _seed_yoga_martes_suscripcion_pasada(
    session,
    profesor: Profesor,
    sala: Sala,
) -> None:
    cliente = await _get_cliente_principal(session)
    if not cliente:
        print("  [skip] suscripcion historica: falta cliente@cef.ar")
        return

    clase = await _upsert_clase_historica(
        session,
        descripcion="Suscripcion historica de prueba",
        dia_semana=DiaSemana.MARTES,
        hora_inicio=time(18, 0),
        hora_fin=time(19, 0),
        profesor=profesor,
        sala=sala,
    )
    fecha_inicio = date(2026, 4, 27)
    fecha_fin = date(2026, 5, 24)

    suscripcion = (await session.execute(
        select(Suscripcion).where(
            Suscripcion.usuario_id == cliente.id,
            Suscripcion.clase_template_id == clase.id,
            Suscripcion.fecha_inicio == fecha_inicio,
            Suscripcion.fecha_fin == fecha_fin,
        )
    )).scalars().first()
    if suscripcion is None:
        suscripcion = Suscripcion(
            usuario_id=cliente.id,
            clase_template_id=clase.id,
            monto=Decimal("4800.00"),
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            fecha_pago=fecha_inicio,
            activo=False,
        )
        session.add(suscripcion)
        await session.flush()
        print("  [ok]   suscripcion historica Yoga")
    else:
        suscripcion.monto = Decimal("4800.00")
        suscripcion.activo = False
        print("  [update] suscripcion historica Yoga")

    fecha_clase = date(2026, 4, 28)
    while fecha_clase <= fecha_fin:
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
        else:
            instancia.cupo = 0
            instancia.activo = True
            instancia.cancelada = False
            instancia.motivo_cancelacion = None

        asistencia = (await session.execute(
            select(Asistencia).where(
                Asistencia.usuario_id == cliente.id,
                Asistencia.clase_instancia_id == instancia.id,
            )
        )).scalars().first()
        if asistencia is None:
            session.add(Asistencia(
                usuario_id=cliente.id,
                clase_instancia_id=instancia.id,
                tipo=TipoInscripcion.SUSCRIPCION,
                asistio=True,
                cancelo=False,
            ))
        else:
            asistencia.tipo = TipoInscripcion.SUSCRIPCION
            asistencia.asistio = True
            asistencia.cancelo = False

        fecha_clase += timedelta(days=7)

    pago = (await session.execute(
        select(Pago).where(Pago.mp_payment_id == "seed-dev-yoga-historica-suscripcion")
    )).scalars().first()
    if pago is None:
        pago = (await session.execute(
            select(Pago).where(Pago.mp_payment_id == "seed-minimal-suscripcion")
        )).scalars().first()

    if pago is None:
        session.add(Pago(
            usuario_id=cliente.id,
            suscripcion_id=suscripcion.id,
            monto=Decimal("4800.00"),
            fecha_pago=datetime.now(timezone.utc),
            estado=EstadoPago.PAGADO,
            mp_payment_id="seed-dev-yoga-historica-suscripcion",
            descripcion="Pago suscripcion historica seed dev",
            activo=True,
        ))
        print("  [ok]   pago suscripcion historica Yoga")
    else:
        pago.usuario_id = cliente.id
        pago.suscripcion_id = suscripcion.id
        pago.monto = Decimal("4800.00")
        pago.estado = EstadoPago.PAGADO
        pago.activo = True
        pago.mp_payment_id = "seed-dev-yoga-historica-suscripcion"
        pago.descripcion = "Pago suscripcion historica seed dev"
        print("  [update] pago suscripcion historica Yoga")
    await session.flush()


async def _seed_suscripcion_pasada_con_cancelaciones(
    session,
    *,
    email_cliente: str,
    nombre_clase: str,
    dia_semana: DiaSemana,
    hora_inicio: time,
    fecha_inicio: date,
    fecha_fin: date,
    fecha_primer_clase: date,
    n_canceladas: int,
    monto: Decimal,
    mp_payment_id: str,
) -> None:
    """
    Crea una suscripción pasada (activo=False) sobre un template YA EXISTENTE.
    Las últimas n_canceladas clases quedan como canceladas por el usuario
    (SuscripcionReserva.activa=False, sin Asistencia) y generan cupones de descuento.
    Usar templates activos para que list_unused_for_renewal encuentre los cupones
    al renovar la suscripción del mismo template.
    """
    cliente = (await session.execute(
        select(Usuario).where(Usuario.email == email_cliente)
    )).scalars().first()
    if not cliente:
        print(f"  [skip] suscripcion pasada {email_cliente}: cliente no encontrado")
        return

    clase = (await session.execute(
        select(ClaseTemplate).where(
            ClaseTemplate.nombre == nombre_clase,
            ClaseTemplate.dia_semana == dia_semana,
            ClaseTemplate.hora_inicio == hora_inicio,
        )
    )).scalars().first()
    if not clase:
        print(f"  [skip] suscripcion pasada {email_cliente}: no existe template {nombre_clase} {dia_semana} {hora_inicio}")
        return

    # Cleanup: borrar suscripciones de renovacion creadas por runs previos del cron
    next_subs = list((await session.execute(
        select(Suscripcion).where(
            Suscripcion.usuario_id == cliente.id,
            Suscripcion.clase_template_id == clase.id,
            Suscripcion.fecha_inicio > fecha_fin,
        )
    )).scalars().all())
    for next_sub in next_subs:
        pagos = list((await session.execute(
            select(Pago).where(Pago.suscripcion_id == next_sub.id)
        )).scalars().all())
        for p in pagos:
            await session.delete(p)
        reservas = list((await session.execute(
            select(SuscripcionReserva).where(SuscripcionReserva.suscripcion_id == next_sub.id)
        )).scalars().all())
        for r in reservas:
            asis = (await session.execute(
                select(Asistencia).where(
                    Asistencia.usuario_id == cliente.id,
                    Asistencia.clase_instancia_id == r.clase_instancia_id,
                    Asistencia.tipo == TipoInscripcion.SUSCRIPCION,
                )
            )).scalars().first()
            if asis:
                await session.delete(asis)
            await session.delete(r)
        await session.delete(next_sub)
    if next_subs:
        await session.flush()
        print(f"  [cleanup] {len(next_subs)} suscripcion(es) de renovacion eliminada(s) para {email_cliente}")

    suscripcion = (await session.execute(
        select(Suscripcion).where(
            Suscripcion.usuario_id == cliente.id,
            Suscripcion.clase_template_id == clase.id,
            Suscripcion.fecha_inicio == fecha_inicio,
        )
    )).scalars().first()
    if suscripcion is None:
        suscripcion = Suscripcion(
            usuario_id=cliente.id,
            clase_template_id=clase.id,
            monto=monto,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            fecha_pago=fecha_inicio,
            activo=True,
        )
        session.add(suscripcion)
        await session.flush()
        print(f"  [ok]   suscripcion vencida {email_cliente}")
    else:
        suscripcion.monto = monto
        suscripcion.activo = True
        await session.flush()
        print(f"  [update] suscripcion vencida {email_cliente}")

    fechas_clases = []
    fecha_clase = fecha_primer_clase
    while fecha_clase <= fecha_fin:
        fechas_clases.append(fecha_clase)
        fecha_clase += timedelta(days=7)

    total_clases = len(fechas_clases)
    indices_canceladas = set(range(total_clases - n_canceladas, total_clases))

    for i, fecha in enumerate(fechas_clases):
        es_cancelada = i in indices_canceladas

        instancia = (await session.execute(
            select(ClaseInstancia).where(
                ClaseInstancia.clase_template_id == clase.id,
                ClaseInstancia.fecha == fecha,
            )
        )).scalars().first()
        if instancia is None:
            instancia = ClaseInstancia(
                clase_template_id=clase.id,
                fecha=fecha,
                cupo=0,
                activo=True,
            )
            session.add(instancia)
            await session.flush()

        reserva = (await session.execute(
            select(SuscripcionReserva).where(
                SuscripcionReserva.suscripcion_id == suscripcion.id,
                SuscripcionReserva.clase_instancia_id == instancia.id,
            )
        )).scalars().first()
        if reserva is None:
            session.add(SuscripcionReserva(
                suscripcion_id=suscripcion.id,
                clase_instancia_id=instancia.id,
                activa=not es_cancelada,
            ))
        else:
            reserva.activa = not es_cancelada

        asistencia = (await session.execute(
            select(Asistencia).where(
                Asistencia.usuario_id == cliente.id,
                Asistencia.clase_instancia_id == instancia.id,
                Asistencia.tipo == TipoInscripcion.SUSCRIPCION,
            )
        )).scalars().first()
        if es_cancelada:
            if asistencia:
                await session.delete(asistencia)
        else:
            if asistencia is None:
                session.add(Asistencia(
                    usuario_id=cliente.id,
                    clase_instancia_id=instancia.id,
                    tipo=TipoInscripcion.SUSCRIPCION,
                    asistio=True,
                    cancelo=False,
                ))
            else:
                asistencia.asistio = True
                asistencia.cancelo = False

    await session.flush()

    descuento = Decimal(100) / Decimal(str(max(total_clases, 1)))
    cupones_existentes = list((await session.execute(
        select(CuponDescuento).where(CuponDescuento.suscripcion_id == suscripcion.id)
    )).scalars().all())
    for cupon in cupones_existentes:
        cupon.descuento_porcentaje = descuento
        cupon.usado = False
    for _ in range(max(0, n_canceladas - len(cupones_existentes))):
        session.add(CuponDescuento(
            suscripcion_id=suscripcion.id,
            descuento_porcentaje=descuento,
            usado=False,
        ))

    pago = (await session.execute(
        select(Pago).where(Pago.mp_payment_id == mp_payment_id)
    )).scalars().first()
    if pago is None:
        session.add(Pago(
            usuario_id=cliente.id,
            suscripcion_id=suscripcion.id,
            monto=monto,
            fecha_pago=datetime(fecha_inicio.year, fecha_inicio.month, fecha_inicio.day, 12, 0, 0, tzinfo=timezone.utc),
            estado=EstadoPago.PAGADO,
            mp_payment_id=mp_payment_id,
            descripcion=f"Suscripcion pasada {nombre_clase} seed dev",
            activo=True,
        ))
        print(f"  [ok]   pago suscripcion pasada {email_cliente}")
    else:
        pago.usuario_id = cliente.id
        pago.suscripcion_id = suscripcion.id
        pago.monto = monto
        pago.estado = EstadoPago.PAGADO
        pago.activo = True
        print(f"  [update] pago suscripcion pasada {email_cliente}")
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
            "disciplina": "yoga",
            "dia_semana": DiaSemana.MARTES,
            "hora_inicio": time(9, 0),
            "hora_fin": time(10, 0),
            "capacidad_maxima": 15,
        },
        {
            "nombre": "Funcional",
            "descripcion": "Entrenamiento funcional de alta intensidad",
            "disciplina": "funcional",
            "dia_semana": DiaSemana.MIERCOLES,
            "hora_inicio": time(18, 0),
            "hora_fin": time(19, 0),
            "capacidad_maxima": 20,
        },
        {
            "nombre": "Pilates",
            "descripcion": "Pilates mat para fortalecimiento y flexibilidad",
            "disciplina": "pilates",
            "dia_semana": DiaSemana.VIERNES,
            "hora_inicio": time(10, 0),
            "hora_fin": time(11, 0),
            "capacidad_maxima": 12,
        },
    ]
    clases_seeded = {}
    for i, data in enumerate(clases):
        clase = await upsert_clase(data, profesores[i], salas[i])
        clases_seeded[(data["nombre"], data["dia_semana"], data["hora_inicio"])] = clase

    pilates_martes = await upsert_clase(
        {
            "nombre": "Pilates",
            "descripcion": "Pilates con Ana Pérez",
            "disciplina": "pilates",
            "dia_semana": DiaSemana.MARTES,
            "hora_inicio": time(15, 0),
            "hora_fin": time(16, 0),
            "capacidad_maxima": 1,
        },
        profesores[1],
        salas[1],
    )

    await upsert_clase(
        {
            "nombre": "Funcional",
            "descripcion": "Clase de prueba de los viernes",
            "disciplina": "funcional",
            "dia_semana": DiaSemana.VIERNES,
            "hora_inicio": time(10, 0),
            "hora_fin": time(11, 0),
            "capacidad_maxima": 10,
        },
        profesores[0],
        salas[0],
    )


async def _seed_reservas_pagadas_por_disciplina(session) -> None:
    cliente = (await session.execute(
        select(Usuario).where(Usuario.email == "cliente_abril@cef.ar")
    )).scalars().first()
    if not cliente:
        print("  [skip] reservas por disciplina: falta cliente_abril@cef.ar")
        return

    reservas = [
        ("yoga", "Yoga", DiaSemana.MARTES, time(9, 0), date(2026, 6, 23)),
        ("funcional", "Funcional", DiaSemana.MIERCOLES, time(18, 0), date(2026, 6, 24)),
        ("pilates", "Pilates", DiaSemana.VIERNES, time(10, 0), date(2026, 6, 26)),
    ]

    for disciplina_nombre, clase_nombre, dia_semana, hora_inicio, fecha_clase in reservas:
        clase = (await session.execute(
            select(ClaseTemplate).where(
                ClaseTemplate.nombre == clase_nombre,
                ClaseTemplate.disciplina == disciplina_nombre,
                ClaseTemplate.dia_semana == dia_semana,
                ClaseTemplate.hora_inicio == hora_inicio,
                ClaseTemplate.activo == True,
            )
        )).scalars().first()
        if not clase:
            print(f"  [skip] reserva {disciplina_nombre}: clase no encontrada")
            continue

        disciplina = (await session.execute(
            select(DisciplinaModel).where(DisciplinaModel.nombre == disciplina_nombre)
        )).scalars().first()
        monto = Decimal(str(disciplina.precio_individual)) if disciplina else Decimal("1500.00")

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
                cupo=max(0, clase.capacidad_maxima - 1),
                activo=True,
            )
            session.add(instancia)
            await session.flush()
            print(f"  [ok]   instancia reserva {disciplina_nombre}")
        else:
            instancia.cupo = max(0, clase.capacidad_maxima - 1)
            instancia.activo = True
            instancia.cancelada = False
            instancia.motivo_cancelacion = None
            print(f"  [update] instancia reserva {disciplina_nombre}")

        asistencia = (await session.execute(
            select(Asistencia).where(
                Asistencia.usuario_id == cliente.id,
                Asistencia.clase_instancia_id == instancia.id,
                Asistencia.tipo == TipoInscripcion.INDIVIDUAL,
            )
        )).scalars().first()
        if asistencia is None:
            session.add(Asistencia(
                usuario_id=cliente.id,
                clase_instancia_id=instancia.id,
                tipo=TipoInscripcion.INDIVIDUAL,
                asistio=False,
                cancelo=False,
            ))
            print(f"  [ok]   reserva individual {disciplina_nombre}")
        else:
            asistencia.asistio = False
            asistencia.cancelo = False
            print(f"  [update] reserva individual {disciplina_nombre}")

        mp_payment_id = f"seed-reserva-pagada-{disciplina_nombre}"
        pago = (await session.execute(
            select(Pago).where(Pago.mp_payment_id == mp_payment_id)
        )).scalars().first()
        if pago is None:
            session.add(Pago(
                usuario_id=cliente.id,
                clase_instancia_id=instancia.id,
                monto=monto,
                fecha_pago=datetime(fecha_clase.year, fecha_clase.month, fecha_clase.day, 12, 0, 0, tzinfo=timezone.utc),
                estado=EstadoPago.PAGADO,
                mp_payment_id=mp_payment_id,
                descripcion=f"Reserva pagada {disciplina_nombre} seed dev",
                activo=True,
            ))
            print(f"  [ok]   pago reserva {disciplina_nombre}")
        else:
            pago.usuario_id = cliente.id
            pago.clase_instancia_id = instancia.id
            pago.suscripcion_id = None
            pago.monto = monto
            pago.fecha_pago = datetime(fecha_clase.year, fecha_clase.month, fecha_clase.day, 12, 0, 0, tzinfo=timezone.utc)
            pago.estado = EstadoPago.PAGADO
            pago.activo = True
            pago.descripcion = f"Reserva pagada {disciplina_nombre} seed dev"
            print(f"  [update] pago reserva {disciplina_nombre}")

    await session.flush()



async def _get_active_class_template(
    session,
    *,
    nombre: str,
    disciplina: str,
    dia_semana: DiaSemana,
    hora_inicio: time,
) -> ClaseTemplate | None:
    return (await session.execute(
        select(ClaseTemplate).where(
            ClaseTemplate.nombre == nombre,
            ClaseTemplate.disciplina == disciplina,
            ClaseTemplate.dia_semana == dia_semana,
            ClaseTemplate.hora_inicio == hora_inicio,
            ClaseTemplate.activo == True,
        )
    )).scalars().first()


async def _upsert_clase_instancia_seed(
    session,
    *,
    clase: ClaseTemplate,
    fecha_clase: date,
    cupo: int,
) -> ClaseInstancia:
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
            cupo=cupo,
            activo=True,
        )
        session.add(instancia)
        await session.flush()
    else:
        instancia.cupo = cupo
        instancia.activo = True
        instancia.cancelada = False
        instancia.motivo_cancelacion = None
    return instancia


async def _seed_cliente_suscripcion_renovable(session) -> None:
    cliente = await _get_cliente_principal(session)
    if not cliente:
        print("  [skip] suscripcion renovable cliente: falta cliente@cef.ar")
        return

    clase = await _get_active_class_template(
        session,
        nombre="Yoga",
        disciplina="yoga",
        dia_semana=DiaSemana.MARTES,
        hora_inicio=time(9, 0),
    )
    if not clase:
        print("  [skip] suscripcion renovable cliente: no existe Yoga Martes 09:00")
        return

    disciplina = (await session.execute(
        select(DisciplinaModel).where(DisciplinaModel.nombre == "yoga")
    )).scalars().first()
    precio = Decimal(str(disciplina.precio_suscripcion)) if disciplina else Decimal("1200.00")
    today = date.today()
    fecha_pago = today - timedelta(days=31)
    fecha_inicio = fecha_pago
    fecha_clase_futura = _next_weekday_at_least(today, clase.dia_semana)
    fecha_fin = max(fecha_inicio + timedelta(days=30), fecha_clase_futura)

    pago = (await session.execute(
        select(Pago).where(Pago.mp_payment_id == "seed-cliente-suscripcion-renovable")
    )).scalars().first()
    suscripcion = None
    if pago and pago.suscripcion_id:
        suscripcion = (await session.execute(
            select(Suscripcion).where(Suscripcion.id == pago.suscripcion_id)
        )).scalars().first()
    if suscripcion is None:
        suscripcion = (await session.execute(
            select(Suscripcion).where(
                Suscripcion.usuario_id == cliente.id,
                Suscripcion.clase_template_id == clase.id,
                Suscripcion.fecha_inicio == fecha_inicio,
            )
        )).scalars().first()

    if suscripcion is None:
        suscripcion = Suscripcion(
            usuario_id=cliente.id,
            clase_template_id=clase.id,
            monto=precio,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            fecha_pago=fecha_pago,
            estado=EstadoSuscripcion.RENOVABLE,
            activo=True,
        )
        session.add(suscripcion)
        await session.flush()
        print("  [ok]   suscripcion renovable cliente")
    else:
        suscripcion.usuario_id = cliente.id
        suscripcion.clase_template_id = clase.id
        suscripcion.monto = precio
        suscripcion.fecha_inicio = fecha_inicio
        suscripcion.fecha_fin = fecha_fin
        suscripcion.fecha_pago = fecha_pago
        suscripcion.estado = EstadoSuscripcion.RENOVABLE
        suscripcion.activo = True
        print("  [update] suscripcion renovable cliente")

    fecha_clase = _first_weekday_on_or_after(fecha_inicio, clase.dia_semana)
    while fecha_clase <= fecha_fin:
        instancia = await _upsert_clase_instancia_seed(
            session,
            clase=clase,
            fecha_clase=fecha_clase,
            cupo=max(0, clase.capacidad_maxima - 1),
        )
        reserva = (await session.execute(
            select(SuscripcionReserva).where(
                SuscripcionReserva.suscripcion_id == suscripcion.id,
                SuscripcionReserva.clase_instancia_id == instancia.id,
            )
        )).scalars().first()
        if reserva is None:
            session.add(SuscripcionReserva(
                suscripcion_id=suscripcion.id,
                clase_instancia_id=instancia.id,
                activa=True,
            ))
        else:
            reserva.activa = True

        asistencia = (await session.execute(
            select(Asistencia).where(
                Asistencia.usuario_id == cliente.id,
                Asistencia.clase_instancia_id == instancia.id,
                Asistencia.tipo == TipoInscripcion.SUSCRIPCION,
            )
        )).scalars().first()
        if asistencia is None:
            session.add(Asistencia(
                usuario_id=cliente.id,
                clase_instancia_id=instancia.id,
                tipo=TipoInscripcion.SUSCRIPCION,
                asistio=fecha_clase < today,
                cancelo=False,
            ))
        else:
            asistencia.asistio = fecha_clase < today
            asistencia.cancelo = False

        fecha_clase += timedelta(days=7)

    if pago is not None:
        await session.delete(pago)
        print("  [cleanup] pago removido de suscripcion renovable cliente")
    await session.flush()


async def _upsert_inscripcion_deuda_seed(
    session,
    *,
    cliente: Usuario,
    clase: ClaseTemplate,
    fecha_clase: date,
    mp_payment_id: str,
    descripcion: str,
    vencida: bool,
) -> None:
    disciplina = (await session.execute(
        select(DisciplinaModel).where(DisciplinaModel.nombre == clase.disciplina)
    )).scalars().first()
    precio = Decimal(str(disciplina.precio_individual)) if disciplina else Decimal("1500.00")
    monto_parcial = (precio / Decimal("2")).quantize(Decimal("0.01"))

    pago = (await session.execute(
        select(Pago).where(Pago.mp_payment_id == mp_payment_id)
    )).scalars().first()
    old_instancia_id = pago.clase_instancia_id if pago else None

    instancia = await _upsert_clase_instancia_seed(
        session,
        clase=clase,
        fecha_clase=fecha_clase,
        cupo=clase.capacidad_maxima if vencida else max(0, clase.capacidad_maxima - 1),
    )

    if old_instancia_id and old_instancia_id != instancia.id:
        old_asistencia = (await session.execute(
            select(Asistencia).where(
                Asistencia.usuario_id == cliente.id,
                Asistencia.clase_instancia_id == old_instancia_id,
                Asistencia.tipo == TipoInscripcion.INDIVIDUAL,
            )
        )).scalars().first()
        if old_asistencia:
            await session.delete(old_asistencia)
            await session.flush()

    asistencia = (await session.execute(
        select(Asistencia).where(
            Asistencia.usuario_id == cliente.id,
            Asistencia.clase_instancia_id == instancia.id,
            Asistencia.tipo == TipoInscripcion.INDIVIDUAL,
        )
    )).scalars().first()
    if asistencia is None:
        session.add(Asistencia(
            usuario_id=cliente.id,
            clase_instancia_id=instancia.id,
            tipo=TipoInscripcion.INDIVIDUAL,
            asistio=False,
            cancelo=vencida,
        ))
    else:
        asistencia.asistio = False
        asistencia.cancelo = vencida

    fecha_pago = datetime.now(timezone.utc)
    if pago is None:
        session.add(Pago(
            usuario_id=cliente.id,
            clase_instancia_id=instancia.id,
            suscripcion_id=None,
            monto=monto_parcial,
            fecha_pago=fecha_pago,
            estado=EstadoPago.PAGADO,
            mp_payment_id=mp_payment_id,
            descripcion=descripcion,
            activo=True,
        ))
        print(f"  [ok]   {descripcion}")
    else:
        pago.usuario_id = cliente.id
        pago.clase_instancia_id = instancia.id
        pago.suscripcion_id = None
        pago.monto = monto_parcial
        pago.fecha_pago = fecha_pago
        pago.estado = EstadoPago.PAGADO
        pago.activo = True
        pago.descripcion = descripcion
        print(f"  [update] {descripcion}")
    await session.flush()


async def _seed_cliente_deudas(session) -> None:
    cliente = await _get_cliente_principal(session)
    if not cliente:
        print("  [skip] deudas cliente: falta cliente@cef.ar")
        return

    today = date.today()
    clase_activa = await _get_active_class_template(
        session,
        nombre="Funcional",
        disciplina="funcional",
        dia_semana=DiaSemana.VIERNES,
        hora_inicio=time(10, 0),
    )
    clase_vencida = await _get_active_class_template(
        session,
        nombre="Pilates",
        disciplina="pilates",
        dia_semana=DiaSemana.VIERNES,
        hora_inicio=time(10, 0),
    )
    if not clase_activa or not clase_vencida:
        print("  [skip] deudas cliente: faltan clases para generar deudas")
        return

    await _upsert_inscripcion_deuda_seed(
        session,
        cliente=cliente,
        clase=clase_activa,
        fecha_clase=_previous_weekday_before(today, clase_activa.dia_semana),
        mp_payment_id="seed-cliente-deuda-activa",
        descripcion="Inscripcion con deuda activa cliente seed dev",
        vencida=False,
    )
    await _upsert_inscripcion_deuda_seed(
        session,
        cliente=cliente,
        clase=clase_vencida,
        fecha_clase=_previous_weekday_before(today, clase_vencida.dia_semana),
        mp_payment_id="seed-cliente-deuda-vencida",
        descripcion="Inscripcion con deuda vencida cliente seed dev",
        vencida=True,
    )


async def _seed_suscripcion_vencida_funcional(session) -> None:
    cliente = await _get_cliente_principal(session)
    if not cliente:
        print("  [skip] suscripcion vencida funcional: falta cliente@cef.ar")
        return

    clase = (await session.execute(
        select(ClaseTemplate).where(
            ClaseTemplate.nombre == "Funcional",
            ClaseTemplate.disciplina == "funcional",
            ClaseTemplate.hora_inicio == time(18, 0),
        )
    )).scalars().first()
    if not clase:
        print("  [skip] suscripcion vencida funcional: no existe Funcional 18:00")
        return

    disciplina = (await session.execute(
        select(DisciplinaModel).where(DisciplinaModel.nombre == "funcional")
    )).scalars().first()
    precio = Decimal(str(disciplina.precio_suscripcion)) if disciplina else Decimal("1400.00")

    fecha_inicio = date(2026, 5, 19)
    fecha_fin = date(2026, 6, 18)

    # Cleanup: borrar suscripciones de renovacion creadas por runs previos del cron
    next_subs = list((await session.execute(
        select(Suscripcion).where(
            Suscripcion.usuario_id == cliente.id,
            Suscripcion.clase_template_id == clase.id,
            Suscripcion.fecha_inicio > fecha_fin,
        )
    )).scalars().all())
    for next_sub in next_subs:
        pagos = list((await session.execute(
            select(Pago).where(Pago.suscripcion_id == next_sub.id)
        )).scalars().all())
        for p in pagos:
            await session.delete(p)
        reservas = list((await session.execute(
            select(SuscripcionReserva).where(SuscripcionReserva.suscripcion_id == next_sub.id)
        )).scalars().all())
        for r in reservas:
            asis = (await session.execute(
                select(Asistencia).where(
                    Asistencia.usuario_id == cliente.id,
                    Asistencia.clase_instancia_id == r.clase_instancia_id,
                    Asistencia.tipo == TipoInscripcion.SUSCRIPCION,
                )
            )).scalars().first()
            if asis:
                await session.delete(asis)
            await session.delete(r)
        await session.delete(next_sub)
    if next_subs:
        await session.flush()
        print(f"  [cleanup] {len(next_subs)} suscripcion(es) de renovacion eliminada(s)")

    # Upsert suscripcion vencida
    suscripcion = (await session.execute(
        select(Suscripcion).where(
            Suscripcion.usuario_id == cliente.id,
            Suscripcion.clase_template_id == clase.id,
            Suscripcion.fecha_inicio == fecha_inicio,
        )
    )).scalars().first()
    if suscripcion is None:
        suscripcion = Suscripcion(
            usuario_id=cliente.id,
            clase_template_id=clase.id,
            monto=precio,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            fecha_pago=fecha_inicio,
            activo=True,
        )
        session.add(suscripcion)
        await session.flush()
        print("  [ok]   suscripcion vencida Funcional Miercoles")
    else:
        suscripcion.monto = precio
        suscripcion.fecha_fin = fecha_fin
        suscripcion.activo = True
        await session.flush()
        print("  [update] suscripcion vencida Funcional Miercoles")

    # Instancias, reservas y asistencias para cada miercoles del periodo
    fecha_clase = date(2026, 5, 20)  # primer miercoles >= fecha_inicio
    while fecha_clase <= fecha_fin:
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

        reserva = (await session.execute(
            select(SuscripcionReserva).where(
                SuscripcionReserva.suscripcion_id == suscripcion.id,
                SuscripcionReserva.clase_instancia_id == instancia.id,
            )
        )).scalars().first()
        if reserva is None:
            session.add(SuscripcionReserva(
                suscripcion_id=suscripcion.id,
                clase_instancia_id=instancia.id,
                activa=True,
            ))
        else:
            reserva.activa = True

        asistencia = (await session.execute(
            select(Asistencia).where(
                Asistencia.usuario_id == cliente.id,
                Asistencia.clase_instancia_id == instancia.id,
                Asistencia.tipo == TipoInscripcion.SUSCRIPCION,
            )
        )).scalars().first()
        if asistencia is None:
            session.add(Asistencia(
                usuario_id=cliente.id,
                clase_instancia_id=instancia.id,
                tipo=TipoInscripcion.SUSCRIPCION,
                asistio=True,
                cancelo=False,
            ))
        else:
            asistencia.asistio = True
            asistencia.cancelo = False

        fecha_clase += timedelta(days=7)

    await session.flush()

    # Pago PAGADO con el precio de la disciplina
    pago = (await session.execute(
        select(Pago).where(Pago.mp_payment_id == "seed-suscripcion-vencida-funcional")
    )).scalars().first()
    if pago is None:
        session.add(Pago(
            usuario_id=cliente.id,
            suscripcion_id=suscripcion.id,
            monto=precio,
            fecha_pago=datetime(2026, 5, 19, 12, 0, 0, tzinfo=timezone.utc),
            estado=EstadoPago.PAGADO,
            mp_payment_id="seed-suscripcion-vencida-funcional",
            descripcion="Suscripcion Funcional mayo-junio 2026",
            activo=True,
        ))
        print("  [ok]   pago suscripcion vencida Funcional")
    else:
        pago.suscripcion_id = suscripcion.id
        pago.monto = precio
        pago.estado = EstadoPago.PAGADO
        pago.activo = True
        print("  [update] pago suscripcion vencida Funcional")
    await session.flush()


async def seed_dev() -> None:
    print("Iniciando seed de desarrollo...")
    async with AsyncSessionLocal() as session:
        await _seed_admin(session)
        await _seed_cliente(session)
        await _seed_personal_abril(session)
        profesores = await _seed_profesores(session)
        salas = await _seed_salas(session)
        await _seed_precios(session)
        await _seed_ficha_medica_cliente(session)
        await _seed_clases(session, profesores, salas)
        await _seed_cliente_suscripcion_renovable(session)
        await _seed_cliente_deudas(session)
        await _seed_reservas_pagadas_por_disciplina(session)
        await _seed_suscripcion_vencida_funcional(session)
        # cliente2 (Lucía): ciclo Yoga Martes 9:00 may-19/jun-18, 1 cancelada → 1 cupón 20%
        await _seed_suscripcion_pasada_con_cancelaciones(
            session,
            email_cliente="cliente2@cef.ar",
            nombre_clase="Yoga",
            dia_semana=DiaSemana.MARTES,
            hora_inicio=time(9, 0),
            fecha_inicio=date(2026, 5, 19),
            fecha_fin=date(2026, 6, 18),
            fecha_primer_clase=date(2026, 5, 19),
            n_canceladas=1,
            monto=Decimal("6000.00"),
            mp_payment_id="seed-suscripcion-pasada-cliente2",
        )
        # cliente3 (Joaquín): ciclo Pilates Viernes 10:00 may-19/jun-18, 2 canceladas → 2 cupones 25%
        await _seed_suscripcion_pasada_con_cancelaciones(
            session,
            email_cliente="cliente3@cef.ar",
            nombre_clase="Pilates",
            dia_semana=DiaSemana.VIERNES,
            hora_inicio=time(10, 0),
            fecha_inicio=date(2026, 5, 19),
            fecha_fin=date(2026, 6, 18),
            fecha_primer_clase=date(2026, 5, 22),
            n_canceladas=2,
            monto=Decimal("4800.00"),
            mp_payment_id="seed-suscripcion-pasada-cliente3",
        )
        await session.commit()
    print("\nListo.")
    print("\n--- Cheat sheet /asistencias ---")
    print("  Esc. 1 — Confirmar asistencia  → DNI 30123456  (cliente@cef.ar)")
    print("  Esc. 2 — Sin inscripción activa → DNI 32123456  (cliente2@cef.ar)")
    print("  Esc. 3 — Ya registrada          → DNI 28123456  (cliente3@cef.ar)")
    print("  Esc. 4 — Fuera de horario       → DNI 40123456  (cliente4@cef.ar)")
    print("  Esc. 5 — DNI inexistente        → DNI 99999999  (no existe)")
    print("---------------------------------")


if __name__ == "__main__":
    asyncio.run(seed_dev())
