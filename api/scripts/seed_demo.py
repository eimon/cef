"""
Seed de demo - escenarios de exito y fallo para la presentacion de hoy.

Requiere haber corrido seed_dev.py antes (usa sus personas/profesores/salas base).
Es idempotente: se puede correr mas de una vez sin duplicar datos.

Ejecutar dentro del contenedor de la API:
    docker exec cef_api python scripts/seed_demo.py
"""

import asyncio
import os
import sys
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select

from core.database import AsyncSessionLocal
from core.enums import (
    DiaSemana,
    EstadoPago,
    EstadoWaitlist,
    TipoInscripcion,
)
from core.timezone import LOCAL_TZ
from models.asistencia import Asistencia
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.cupon_descuento import CuponDescuento
from models.disciplina import Disciplina as DisciplinaModel
from models.pagos import Pago
from models.profesor import Profesor
from models.sala import Sala
from models.suscripciones import Suscripcion
from models.usuario import Usuario
from models.waitlist_entry import WaitlistEntry
from schemas.inscripcion import WaitlistJoinCreate
from services.cancelacion_service import CancelacionService
from services.suscripcion_service import SuscripcionService
from services.waitlist_service import WaitlistService


WEEKDAY_TO_DIA = {
    0: DiaSemana.LUNES,
    1: DiaSemana.MARTES,
    2: DiaSemana.MIERCOLES,
    3: DiaSemana.JUEVES,
    4: DiaSemana.VIERNES,
    5: DiaSemana.SABADO,
    6: DiaSemana.DOMINGO,
}


def dia_semana_en(offset_dias: int) -> DiaSemana:
    return WEEKDAY_TO_DIA[(date.today() + timedelta(days=offset_dias)).weekday()]


def fecha_en(offset_dias: int) -> date:
    return date.today() + timedelta(days=offset_dias)


# ─── Helpers genericos (idempotentes) ──────────────────────────────────────

async def get_usuario(session, email: str) -> Usuario | None:
    return (await session.execute(
        select(Usuario).where(Usuario.email == email)
    )).scalars().first()


async def get_profesor_by_nombre(session, nombre: str, apellido: str) -> Profesor | None:
    return (await session.execute(
        select(Profesor).where(Profesor.nombre == nombre, Profesor.apellido == apellido)
    )).scalars().first()


async def get_sala(session, nombre: str) -> Sala | None:
    return (await session.execute(
        select(Sala).where(Sala.nombre == nombre)
    )).scalars().first()


async def upsert_clase(
    session, *, nombre: str, disciplina: str, dia_semana: DiaSemana,
    hora_inicio: time, hora_fin: time, capacidad_maxima: int,
    profesor: Profesor, sala: Sala, descripcion: str,
) -> ClaseTemplate:
    clase = (await session.execute(
        select(ClaseTemplate).where(
            ClaseTemplate.descripcion == descripcion,
        )
    )).scalars().first()
    if clase is None:
        clase = ClaseTemplate(
            nombre=nombre,
            descripcion=descripcion,
            disciplina=disciplina,
            dia_semana=dia_semana,
            hora_inicio=hora_inicio,
            hora_fin=hora_fin,
            capacidad_maxima=capacidad_maxima,
            profesor_id=profesor.id,
            sala_id=sala.id,
            activo=True,
        )
        session.add(clase)
        print(f"  [ok]   clase '{descripcion}'")
    else:
        clase.dia_semana = dia_semana
        clase.hora_inicio = hora_inicio
        clase.hora_fin = hora_fin
        clase.capacidad_maxima = capacidad_maxima
        clase.profesor_id = profesor.id
        clase.sala_id = sala.id
        clase.activo = True
        print(f"  [update] clase '{descripcion}'")
    await session.flush()
    return clase


async def upsert_instancia(session, *, clase: ClaseTemplate, fecha: date, cupo: int) -> ClaseInstancia:
    instancia = (await session.execute(
        select(ClaseInstancia).where(
            ClaseInstancia.clase_template_id == clase.id,
            ClaseInstancia.fecha == fecha,
        )
    )).scalars().first()
    if instancia is None:
        instancia = ClaseInstancia(
            clase_template_id=clase.id, fecha=fecha, cupo=cupo, activo=True,
        )
        session.add(instancia)
        await session.flush()
    else:
        instancia.cupo = cupo
        instancia.activo = True
        instancia.cancelada = False
        instancia.motivo_cancelacion = None
        await session.flush()
    return instancia


async def upsert_asistencia(
    session, *, usuario: Usuario, instancia: ClaseInstancia, tipo: TipoInscripcion,
    asistio: bool, cancelo: bool,
) -> Asistencia:
    asistencia = (await session.execute(
        select(Asistencia).where(
            Asistencia.usuario_id == usuario.id,
            Asistencia.clase_instancia_id == instancia.id,
        )
    )).scalars().first()
    if asistencia is None:
        asistencia = Asistencia(
            usuario_id=usuario.id, clase_instancia_id=instancia.id, tipo=tipo,
            asistio=asistio, cancelo=cancelo,
        )
        session.add(asistencia)
    else:
        asistencia.tipo = tipo
        asistencia.asistio = asistio
        asistencia.cancelo = cancelo
    await session.flush()
    return asistencia


async def upsert_pago(
    session, *, mp_payment_id: str, usuario: Usuario, monto: Decimal,
    estado: EstadoPago, descripcion: str, clase_instancia: ClaseInstancia | None = None,
    suscripcion: Suscripcion | None = None, fecha_pago: datetime | None = None,
) -> Pago:
    pago = (await session.execute(
        select(Pago).where(Pago.mp_payment_id == mp_payment_id)
    )).scalars().first()
    if pago is None:
        pago = Pago(
            usuario_id=usuario.id,
            clase_instancia_id=clase_instancia.id if clase_instancia else None,
            suscripcion_id=suscripcion.id if suscripcion else None,
            monto=monto,
            fecha_pago=fecha_pago or datetime.now(timezone.utc),
            estado=estado,
            mp_payment_id=mp_payment_id,
            descripcion=descripcion,
            activo=True,
        )
        session.add(pago)
        print(f"  [ok]   pago '{mp_payment_id}'")
    else:
        pago.usuario_id = usuario.id
        pago.clase_instancia_id = clase_instancia.id if clase_instancia else None
        pago.suscripcion_id = suscripcion.id if suscripcion else None
        pago.monto = monto
        pago.estado = estado
        pago.descripcion = descripcion
        pago.activo = True
        print(f"  [update] pago '{mp_payment_id}'")
    await session.flush()
    return pago


async def get_precio_individual(session, disciplina: str) -> Decimal:
    disc = (await session.execute(
        select(DisciplinaModel).where(DisciplinaModel.nombre == disciplina)
    )).scalars().first()
    return Decimal(str(disc.precio_individual)) if disc else Decimal("1500.00")


# ─── Cancelaciones + descuento + pagos + deuda (cliente@cef.ar y otros) ────

async def seed_cancelaciones_y_pagos(session, profesor: Profesor, sala: Sala) -> None:
    cliente = await get_usuario(session, "cliente@cef.ar")
    cliente4 = await get_usuario(session, "cliente4@cef.ar")
    if not cliente or not cliente4:
        print("  [skip] cancelaciones/pagos: faltan clientes base")
        return

    precio_yoga = await get_precio_individual(session, "yoga")
    precio_funcional = await get_precio_individual(session, "funcional")
    precio_pilates = await get_precio_individual(session, "pilates")

    # 1) Cancelable CON reintegro (>24hs) - Yoga en 3 dias
    clase_reintegro = await upsert_clase(
        session, nombre="Yoga", disciplina="yoga", dia_semana=dia_semana_en(3),
        hora_inicio=time(21, 0), hora_fin=time(22, 0), capacidad_maxima=10,
        profesor=profesor, sala=sala,
        descripcion="DEMO - Cancelable con reintegro (>24hs)",
    )
    inst_reintegro = await upsert_instancia(session, clase=clase_reintegro, fecha=fecha_en(3), cupo=9)
    await upsert_asistencia(
        session, usuario=cliente, instancia=inst_reintegro,
        tipo=TipoInscripcion.INDIVIDUAL, asistio=False, cancelo=False,
    )
    await upsert_pago(
        session, mp_payment_id="demo-cancelable-reintegro", usuario=cliente,
        monto=precio_yoga, estado=EstadoPago.PAGADO,
        descripcion="DEMO pago completo Yoga (cancelable c/reintegro)",
        clase_instancia=inst_reintegro,
    )

    # 2) Cancelable SIN reintegro (<24hs) - hoy, dentro de un par de horas
    ahora = datetime.now(LOCAL_TZ)
    h_inicio = (ahora + timedelta(hours=2)).time().replace(second=0, microsecond=0)
    h_fin = (ahora + timedelta(hours=3)).time().replace(second=0, microsecond=0)
    clase_sin_reintegro = await upsert_clase(
        session, nombre="Pilates", disciplina="pilates", dia_semana=dia_semana_en(0),
        hora_inicio=h_inicio, hora_fin=h_fin, capacidad_maxima=10,
        profesor=profesor, sala=sala,
        descripcion="DEMO - Cancelable SIN reintegro (<24hs)",
    )
    inst_sin_reintegro = await upsert_instancia(session, clase=clase_sin_reintegro, fecha=fecha_en(0), cupo=9)
    await upsert_asistencia(
        session, usuario=cliente, instancia=inst_sin_reintegro,
        tipo=TipoInscripcion.INDIVIDUAL, asistio=False, cancelo=False,
    )
    await upsert_pago(
        session, mp_payment_id="demo-cancelable-sin-reintegro", usuario=cliente,
        monto=precio_pilates, estado=EstadoPago.PAGADO,
        descripcion="DEMO pago completo Pilates (cancelable s/reintegro)",
        clase_instancia=inst_sin_reintegro,
    )

    # 3) Clase YA PASADA - no se puede cancelar (cliente4)
    clase_pasada = await upsert_clase(
        session, nombre="Funcional", disciplina="funcional", dia_semana=dia_semana_en(0),
        hora_inicio=time(7, 0), hora_fin=time(8, 0), capacidad_maxima=10,
        profesor=profesor, sala=sala,
        descripcion="DEMO - Clase ya comenzada (no cancelable)",
    )
    inst_pasada = await upsert_instancia(session, clase=clase_pasada, fecha=fecha_en(0), cupo=9)
    await upsert_asistencia(
        session, usuario=cliente4, instancia=inst_pasada,
        tipo=TipoInscripcion.INDIVIDUAL, asistio=False, cancelo=False,
    )
    await upsert_pago(
        session, mp_payment_id="demo-clase-pasada", usuario=cliente4,
        monto=precio_funcional, estado=EstadoPago.PAGADO,
        descripcion="DEMO pago Funcional clase ya pasada",
        clase_instancia=inst_pasada,
    )

    # 4) Deuda SALDABLE (>24hs) - Funcional en 3 dias, sena pagada
    clase_deuda_ok = await upsert_clase(
        session, nombre="Funcional", disciplina="funcional", dia_semana=dia_semana_en(3),
        hora_inicio=time(19, 0), hora_fin=time(20, 0), capacidad_maxima=10,
        profesor=profesor, sala=sala,
        descripcion="DEMO - Deuda saldable (>24hs)",
    )
    inst_deuda_ok = await upsert_instancia(session, clase=clase_deuda_ok, fecha=fecha_en(3), cupo=9)
    await upsert_asistencia(
        session, usuario=cliente, instancia=inst_deuda_ok,
        tipo=TipoInscripcion.INDIVIDUAL, asistio=False, cancelo=False,
    )
    sena = (precio_funcional / Decimal("2")).quantize(Decimal("0.01"))
    await upsert_pago(
        session, mp_payment_id="demo-deuda-saldable", usuario=cliente,
        monto=sena, estado=EstadoPago.PAGADO,
        descripcion="DEMO sena Funcional (deuda saldable)",
        clase_instancia=inst_deuda_ok,
    )

    # 5) Deuda NO saldable (<24hs) - hoy, cliente4
    h_inicio2 = (ahora + timedelta(hours=4)).time().replace(second=0, microsecond=0)
    h_fin2 = (ahora + timedelta(hours=5)).time().replace(second=0, microsecond=0)
    clase_deuda_no = await upsert_clase(
        session, nombre="Pilates", disciplina="pilates", dia_semana=dia_semana_en(0),
        hora_inicio=h_inicio2, hora_fin=h_fin2, capacidad_maxima=10,
        profesor=profesor, sala=sala,
        descripcion="DEMO - Deuda NO saldable (<24hs)",
    )
    inst_deuda_no = await upsert_instancia(session, clase=clase_deuda_no, fecha=fecha_en(0), cupo=9)
    await upsert_asistencia(
        session, usuario=cliente4, instancia=inst_deuda_no,
        tipo=TipoInscripcion.INDIVIDUAL, asistio=False, cancelo=False,
    )
    sena2 = (precio_pilates / Decimal("2")).quantize(Decimal("0.01"))
    await upsert_pago(
        session, mp_payment_id="demo-deuda-no-saldable", usuario=cliente4,
        monto=sena2, estado=EstadoPago.PAGADO,
        descripcion="DEMO sena Pilates (deuda no saldable)",
        clase_instancia=inst_deuda_no,
    )

    # 6) Reservar clase particular EN VIVO - clase futura con cupo libre, nadie inscripto
    await upsert_clase(
        session, nombre="Yoga", disciplina="yoga", dia_semana=dia_semana_en(2),
        hora_inicio=time(18, 0), hora_fin=time(19, 0), capacidad_maxima=10,
        profesor=profesor, sala=sala,
        descripcion="DEMO - Reservar clase particular (en vivo)",
    )

    print("  [ok]   cancelaciones, deuda y pago particular listos")


async def seed_descuento(session) -> None:
    """
    Deja a cliente@cef.ar con un cupon sin usar (25%) sobre la suscripcion de
    Funcional Miercoles 18:00, e inicia la renovacion para que el ciclo
    siguiente ya este disponible para previsualizar con el descuento aplicado.
    """
    cliente = await get_usuario(session, "cliente@cef.ar")
    if not cliente:
        print("  [skip] descuento: falta cliente@cef.ar")
        return

    suscripcion_vencida = (await session.execute(
        select(Suscripcion)
        .join(ClaseTemplate, Suscripcion.clase_template_id == ClaseTemplate.id)
        .where(
            Suscripcion.usuario_id == cliente.id,
            ClaseTemplate.dia_semana == DiaSemana.MIERCOLES,
            ClaseTemplate.hora_inicio == time(18, 0),
        )
    )).scalars().first()
    if not suscripcion_vencida:
        print("  [skip] descuento: no existe suscripcion Funcional Miercoles 18:00 para cliente@cef.ar (corre seed_dev.py primero)")
        return

    cupon = (await session.execute(
        select(CuponDescuento).where(
            CuponDescuento.suscripcion_id == suscripcion_vencida.id,
            CuponDescuento.usado == False,
        )
    )).scalars().first()
    if cupon is None:
        session.add(CuponDescuento(
            suscripcion_id=suscripcion_vencida.id,
            descuento_porcentaje=Decimal("25.00"),
            usado=False,
        ))
        print("  [ok]   cupon de descuento 25% para cliente@cef.ar (Funcional Miercoles)")
    else:
        cupon.descuento_porcentaje = Decimal("25.00")
        cupon.usado = False
        print("  [update] cupon de descuento 25% para cliente@cef.ar (Funcional Miercoles)")
    await session.flush()

    today = date.today()
    if today > suscripcion_vencida.fecha_fin:
        try:
            resultado = await SuscripcionService(session).iniciar_renovacion(
                cliente, suscripcion_vencida.id
            )
            print(f"  [ok]   renovacion iniciada (Funcional) -> suscripcion {resultado.siguiente_suscripcion_id}")
        except Exception as exc:
            print(f"  [info] renovacion Funcional ya estaba iniciada o no se pudo: {exc}")
    else:
        print("  [info] la suscripcion de Funcional todavia no vencio, no se inicia renovacion")
    await session.flush()


# ─── Lista de espera ────────────────────────────────────────────────────────

async def seed_waitlist(session, profesor: Profesor, sala: Sala) -> None:
    cliente2 = await get_usuario(session, "cliente2@cef.ar")
    cliente3 = await get_usuario(session, "cliente3@cef.ar")
    cliente4 = await get_usuario(session, "cliente4@cef.ar")
    if not cliente2 or not cliente3 or not cliente4:
        print("  [skip] waitlist: faltan clientes base")
        return

    # Clase A: capacidad 1, ya ocupada por cliente2. cliente3 se anota en espera.
    # Se cancela la reserva de cliente2 -> dispara la promocion real -> cliente3 pasa a NOTIFICADO.
    clase_a = await upsert_clase(
        session, nombre="Yoga", disciplina="yoga", dia_semana=dia_semana_en(4),
        hora_inicio=time(20, 0), hora_fin=time(21, 0), capacidad_maxima=1,
        profesor=profesor, sala=sala,
        descripcion="DEMO - Lista de espera (confirmar cupo liberado)",
    )
    fecha_a = fecha_en(4)
    inst_a = await upsert_instancia(session, clase=clase_a, fecha=fecha_a, cupo=0)
    asistencia_c2 = await upsert_asistencia(
        session, usuario=cliente2, instancia=inst_a,
        tipo=TipoInscripcion.INDIVIDUAL, asistio=False, cancelo=False,
    )
    precio_yoga = await get_precio_individual(session, "yoga")
    await upsert_pago(
        session, mp_payment_id="demo-waitlist-cliente2-original", usuario=cliente2,
        monto=precio_yoga, estado=EstadoPago.PAGADO,
        descripcion="DEMO pago Yoga (luego cancelado para liberar cupo)",
        clase_instancia=inst_a,
    )

    waitlist_service = WaitlistService(session)
    entry_c3 = (await session.execute(
        select(WaitlistEntry).where(
            WaitlistEntry.usuario_id == cliente3.id,
            WaitlistEntry.clase_template_id == clase_a.id,
            WaitlistEntry.fecha == fecha_a,
        )
    )).scalars().first()
    if entry_c3 is None or entry_c3.estado not in (EstadoWaitlist.EN_ESPERA, EstadoWaitlist.NOTIFICADO):
        try:
            await waitlist_service.join_waitlist(
                cliente3, WaitlistJoinCreate(clase_template_id=clase_a.id, fecha=fecha_a)
            )
            print("  [ok]   cliente3 anotado en lista de espera (clase A)")
        except Exception as exc:
            print(f"  [info] cliente3 ya estaba en espera o no se pudo anotar: {exc}")

    if not asistencia_c2.cancelo:
        try:
            await CancelacionService(session).cancelar(cliente2, asistencia_c2.id)
            print("  [ok]   cupo de cliente2 liberado -> cliente3 deberia estar NOTIFICADO")
        except Exception as exc:
            print(f"  [info] no se pudo cancelar la reserva de cliente2: {exc}")

    # Clase B: llena, cliente4 se anota en espera, NO se libera nada (para "darse de baja").
    clase_b = await upsert_clase(
        session, nombre="Pilates", disciplina="pilates", dia_semana=dia_semana_en(5),
        hora_inicio=time(20, 0), hora_fin=time(21, 0), capacidad_maxima=1,
        profesor=profesor, sala=sala,
        descripcion="DEMO - Lista de espera (darse de baja)",
    )
    fecha_b = fecha_en(5)
    inst_b = await upsert_instancia(session, clase=clase_b, fecha=fecha_b, cupo=0)
    await upsert_asistencia(
        session, usuario=cliente2, instancia=inst_b,
        tipo=TipoInscripcion.INDIVIDUAL, asistio=False, cancelo=False,
    )
    precio_pilates = await get_precio_individual(session, "pilates")
    await upsert_pago(
        session, mp_payment_id="demo-waitlist-clase-b-ocupante", usuario=cliente2,
        monto=precio_pilates, estado=EstadoPago.PAGADO,
        descripcion="DEMO pago Pilates (ocupa el unico cupo, clase B)",
        clase_instancia=inst_b,
    )
    entry_c4 = (await session.execute(
        select(WaitlistEntry).where(
            WaitlistEntry.usuario_id == cliente4.id,
            WaitlistEntry.clase_template_id == clase_b.id,
            WaitlistEntry.fecha == fecha_b,
        )
    )).scalars().first()
    if entry_c4 is None:
        try:
            await WaitlistService(session).join_waitlist(
                cliente4, WaitlistJoinCreate(clase_template_id=clase_b.id, fecha=fecha_b)
            )
            print("  [ok]   cliente4 anotado en lista de espera (clase B, para darse de baja)")
        except Exception as exc:
            print(f"  [info] cliente4 no se pudo anotar en clase B: {exc}")
    else:
        print("  [skip] cliente4 ya esta en lista de espera (clase B)")


# ─── Asistencias de hoy ─────────────────────────────────────────────────────

async def seed_asistencias_hoy(session, profesor: Profesor, sala: Sala) -> None:
    cliente = await get_usuario(session, "cliente@cef.ar")
    cliente3 = await get_usuario(session, "cliente3@cef.ar")
    cliente4 = await get_usuario(session, "cliente4@cef.ar")
    if not cliente or not cliente3 or not cliente4:
        print("  [skip] asistencias hoy: faltan clientes base")
        return

    ahora = datetime.now(LOCAL_TZ)
    hoy = date.today()

    # Clase EN CURSO ahora mismo (ventana amplia para sobrevivir hasta la demo)
    h_ini = (ahora - timedelta(minutes=30)).time().replace(second=0, microsecond=0)
    h_fin = (ahora + timedelta(hours=4)).time().replace(second=0, microsecond=0)
    clase_en_curso = await upsert_clase(
        session, nombre="Funcional", disciplina="funcional", dia_semana=dia_semana_en(0),
        hora_inicio=h_ini, hora_fin=h_fin, capacidad_maxima=15,
        profesor=profesor, sala=sala,
        descripcion="DEMO - Asistencia: clase en curso (exito)",
    )
    inst_en_curso = await upsert_instancia(session, clase=clase_en_curso, fecha=hoy, cupo=13)
    await upsert_asistencia(
        session, usuario=cliente, instancia=inst_en_curso,
        tipo=TipoInscripcion.INDIVIDUAL, asistio=False, cancelo=False,
    )
    await upsert_asistencia(
        session, usuario=cliente3, instancia=inst_en_curso,
        tipo=TipoInscripcion.INDIVIDUAL, asistio=True, cancelo=False,
    )

    # Clase YA TERMINADA hoy (fuera de horario)
    clase_terminada = await upsert_clase(
        session, nombre="Yoga", disciplina="yoga", dia_semana=dia_semana_en(0),
        hora_inicio=time(6, 0), hora_fin=time(7, 0), capacidad_maxima=15,
        profesor=profesor, sala=sala,
        descripcion="DEMO - Asistencia: clase ya terminada (fuera de horario)",
    )
    inst_terminada = await upsert_instancia(session, clase=clase_terminada, fecha=hoy, cupo=14)
    await upsert_asistencia(
        session, usuario=cliente4, instancia=inst_terminada,
        tipo=TipoInscripcion.INDIVIDUAL, asistio=False, cancelo=False,
    )

    print("  [ok]   asistencias de hoy listas (en curso / ya terminada)")
    print(f"         DNI sin inscripcion (para probar fallo): 90000000 (no existe)")


# ─── Datos extra para que los reportes no se vean vacios ──────────────────

async def seed_reportes_extra(session, profesor: Profesor, sala: Sala) -> None:
    cliente2 = await get_usuario(session, "cliente2@cef.ar")
    cliente3 = await get_usuario(session, "cliente3@cef.ar")
    cliente4 = await get_usuario(session, "cliente4@cef.ar")
    if not cliente2 or not cliente3 or not cliente4:
        print("  [skip] reportes extra: faltan clientes base")
        return

    # Mas cancelaciones distribuidas en los ultimos dias para el ranking por clase
    clase_reportes = await upsert_clase(
        session, nombre="Yoga", disciplina="yoga", dia_semana=dia_semana_en(-2),
        hora_inicio=time(17, 0), hora_fin=time(18, 0), capacidad_maxima=15,
        profesor=profesor, sala=sala,
        descripcion="DEMO - Historico para reportes (cancelaciones)",
    )
    for offset, cliente_rep in ((-14, cliente2), (-7, cliente3), (-2, cliente4)):
        fecha_rep = fecha_en(offset)
        inst_rep = await upsert_instancia(session, clase=clase_reportes, fecha=fecha_rep, cupo=14)
        await upsert_asistencia(
            session, usuario=cliente_rep, instancia=inst_rep,
            tipo=TipoInscripcion.INDIVIDUAL, asistio=False, cancelo=True,
        )
    print("  [ok]   cancelaciones historicas para el reporte 'cancelaciones por clase'")

    # Un usuario dado de baja reciente, para el reporte de bajas
    baja = await get_usuario(session, "demo_baja@cef.ar")
    if baja is None:
        from core.security import get_password_hash
        from core.enums import UserRole
        baja = Usuario(
            email="demo_baja@cef.ar",
            telefono="1100000099",
            hashed_password=get_password_hash("cliente123"),
            nombre="Demo",
            apellido="DadoDeBaja",
            dni="50123456",
            role=UserRole.CLIENTE,
            activo=False,
            email_verified_at=datetime.now(timezone.utc),
            registration_completed_at=datetime.now(timezone.utc),
        )
        session.add(baja)
        print("  [ok]   usuario demo_baja@cef.ar creado como dado de baja")
    else:
        baja.activo = False
        print("  [update] usuario demo_baja@cef.ar dado de baja")
    await session.flush()


# ─── main ───────────────────────────────────────────────────────────────────

async def seed_demo() -> None:
    print("Iniciando seed de demo...")
    async with AsyncSessionLocal() as session:
        profesor = await get_profesor_by_nombre(session, "Luis", "Martínez")
        sala = await get_sala(session, "Sala 1")
        if not profesor or not sala:
            print("ERROR: falta el profesor base (Luis Martínez) o Sala 1. Corre seed_dev.py primero.")
            return

        await seed_cancelaciones_y_pagos(session, profesor, sala)
        await seed_descuento(session)
        await seed_waitlist(session, profesor, sala)
        await seed_asistencias_hoy(session, profesor, sala)
        await seed_reportes_extra(session, profesor, sala)

        await session.commit()

    print("\nListo.\n")
    print_cheat_sheet()


def print_cheat_sheet() -> None:
    print("=" * 70)
    print("GUIA DE DEMO — ver tambien el resumen completo en el chat")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(seed_demo())
