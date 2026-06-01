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
from core.enums import DiaSemana, Disciplina, EstadoPago, TipoInscripcion, UserRole
from core.security import get_password_hash
from models.asistencia import Asistencia
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.ficha_medica import FichaMedica
from models.pagos import Pago
from models.precio_disciplina import PrecioDisciplina
from models.profesor import Profesor
from models.sala import Sala
from models.suscripciones import Suscripcion
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
        cliente.email_verified_at = cliente.email_verified_at or datetime.now(timezone.utc)
        cliente.registration_completed_at = cliente.registration_completed_at or datetime.now(timezone.utc)
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
    descripcion: str,
    dia_semana: DiaSemana,
    hora_inicio: time,
    hora_fin: time,
    profesor: Profesor,
    sala: Sala,
) -> ClaseTemplate:
    clase = (await session.execute(
        select(ClaseTemplate).where(
            ClaseTemplate.nombre == "Yoga",
            ClaseTemplate.descripcion == descripcion,
            ClaseTemplate.dia_semana == dia_semana,
            ClaseTemplate.hora_inicio == hora_inicio,
        )
    )).scalars().first()

    if clase is None:
        clase = ClaseTemplate(
            nombre="Yoga",
            descripcion=descripcion,
            profesor_id=profesor.id,
            sala_id=sala.id,
            disciplina=Disciplina.YOGA,
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
    clases_seeded = {}
    for i, data in enumerate(clases):
        clase = await upsert_clase(data, profesores[i], salas[i])
        clases_seeded[(data["nombre"], data["dia_semana"], data["hora_inicio"])] = clase

    pilates_martes = await upsert_clase(
        {
            "nombre": "Pilates",
            "descripcion": "Pilates con Ana Pérez",
            "disciplina": Disciplina.PILATES,
            "dia_semana": DiaSemana.MARTES,
            "hora_inicio": time(15, 0),
            "hora_fin": time(16, 0),
            "capacidad_maxima": 12,
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

    await _seed_yoga_martes_deuda_vencida(
        session,
        clases_seeded[("Yoga", DiaSemana.MARTES, time(9, 0))],
    )
    await _seed_pilates_martes_inscripto(session, pilates_martes)


async def _seed_yoga_martes_deuda_vencida(session, clase: ClaseTemplate) -> None:
    usuario = (await session.execute(
        select(Usuario).where(Usuario.email == "cliente@cef.ar")
    )).scalars().first()
    if not usuario:
        print("  [skip] deuda parcial Yoga 2026-06-02: falta cliente@cef.ar")
        return

    fecha_clase = date(2026, 6, 2)
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
            cupo=clase.capacidad_maxima - 1,
            activo=True,
        )
        session.add(instancia)
        await session.flush()
        print("  [ok]   instancia Yoga 2026-06-02")
    else:
        instancia.cupo = clase.capacidad_maxima - 1
        instancia.activo = True
        instancia.cancelada = False
        instancia.motivo_cancelacion = None
        print("  [update] instancia Yoga 2026-06-02")

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
        print("  [ok]   deuda parcial Yoga 2026-06-02")
    else:
        asistencia.tipo = TipoInscripcion.INDIVIDUAL
        asistencia.asistio = False
        asistencia.cancelo = False
        print("  [update] deuda parcial Yoga 2026-06-02")

    pago = (await session.execute(
        select(Pago).where(
            Pago.usuario_id == usuario.id,
            Pago.clase_instancia_id == instancia.id,
            Pago.mp_payment_id == "seed-dev-yoga-martes-2026-06-02-parcial",
        )
    )).scalars().first()
    if pago is None:
        session.add(Pago(
            usuario_id=usuario.id,
            clase_instancia_id=instancia.id,
            monto=Decimal("750.00"),
            fecha_pago=datetime.now(timezone.utc),
            estado=EstadoPago.PAGADO,
            mp_payment_id="seed-dev-yoga-martes-2026-06-02-parcial",
            descripcion="Pago parcial seed Yoga martes 2026-06-02",
            activo=True,
        ))
        print("  [ok]   pago parcial Yoga 2026-06-02")
    else:
        pago.monto = Decimal("750.00")
        pago.estado = EstadoPago.PAGADO
        pago.activo = True
        print("  [update] pago parcial Yoga 2026-06-02")


async def _seed_pilates_martes_inscripto(session, clase: ClaseTemplate) -> None:
    usuario = (await session.execute(
        select(Usuario).where(Usuario.email == "cliente@cef.ar")
    )).scalars().first()
    if not usuario:
        print("  [skip] inscripcion pilates martes: falta cliente@cef.ar")
        return

    fecha_clase = date(2026, 6, 9)
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
            cupo=clase.capacidad_maxima - 1,
            activo=True,
        )
        session.add(instancia)
        await session.flush()
        print("  [ok]   instancia Pilates 2026-06-09")
    else:
        instancia.cupo = clase.capacidad_maxima - 1
        instancia.activo = True
        instancia.cancelada = False
        instancia.motivo_cancelacion = None
        print("  [update] instancia Pilates 2026-06-09")

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
            asistio=True,
            cancelo=False,
        ))
        print("  [ok]   inscripcion Pilates 2026-06-09")
    else:
        asistencia.tipo = TipoInscripcion.INDIVIDUAL
        asistencia.asistio = True
        asistencia.cancelo = False
        print("  [update] inscripcion Pilates 2026-06-09")

    pago = (await session.execute(
        select(Pago).where(
            Pago.usuario_id == usuario.id,
            Pago.clase_instancia_id == instancia.id,
            Pago.mp_payment_id == "seed-dev-pilates-martes-2026-06-09",
        )
    )).scalars().first()
    if pago is None:
        session.add(Pago(
            usuario_id=usuario.id,
            clase_instancia_id=instancia.id,
            monto=Decimal("1500.00"),
            fecha_pago=datetime.now(timezone.utc),
            estado=EstadoPago.PAGADO,
            mp_payment_id="seed-dev-pilates-martes-2026-06-09",
            descripcion="Pago individual seed Pilates martes 2026-06-09",
            activo=True,
        ))
        print("  [ok]   pago Pilates 2026-06-09")


async def seed_dev() -> None:
    print("Iniciando seed de desarrollo...")
    async with AsyncSessionLocal() as session:
        await _seed_admin(session)
        await _seed_cliente(session)
        profesores = await _seed_profesores(session)
        salas = await _seed_salas(session)
        await _seed_precios(session)
        await _seed_ficha_medica_cliente(session)
        await _seed_clases(session, profesores, salas)
        await _seed_yoga_lunes_individual_pasada(session, profesores[0], salas[0])
        await _seed_yoga_martes_suscripcion_pasada(session, profesores[0], salas[0])
        await session.commit()
    print("Listo.")


if __name__ == "__main__":
    asyncio.run(seed_dev())
