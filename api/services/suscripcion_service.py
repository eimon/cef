import uuid
from datetime import date, timedelta, datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from core.enums import DiaSemana, EstadoSuscripcion
from core.timezone import LOCAL_TZ
from exceptions.general import BadRequestException, ConflictException, NotFoundException
from models.usuario import Usuario
from core.enums import EstadoPago
from repositories.cupon_descuento_repository import CuponDescuentoRepository
from repositories.pago_repository import PagoRepository
from repositories.suscripcion_repository import SuscripcionRepository
from repositories.disciplina_repository import DisciplinaRepository
from repositories.configuracion_repository import ConfiguracionRepository
from schemas.suscripcion import (
    RenovacionIniciadaResponse,
    RenovacionSuscripcionPendienteResponse,
    SuscripcionCreate,
    SuscripcionCheckResponse,
    SuscripcionResponse,
)
from services.suscripcion_state import get_subscription_state, renewal_window


async def _get_porcentaje_sena(db) -> float:
    config = await ConfiguracionRepository(db).get_by_clave("sena_minima")
    try:
        return float(config.valor) if config else 50.0
    except (ValueError, TypeError):
        return 50.0


_DIA_TO_WEEKDAY = {
    DiaSemana.LUNES: 0,
    DiaSemana.MARTES: 1,
    DiaSemana.MIERCOLES: 2,
    DiaSemana.JUEVES: 3,
    DiaSemana.VIERNES: 4,
    DiaSemana.SABADO: 5,
    DiaSemana.DOMINGO: 6,
}


def _proxima_fecha(dia_semana: DiaSemana) -> date:
    hoy = datetime.now(LOCAL_TZ).date()
    dias = ((_DIA_TO_WEEKDAY[dia_semana] - hoy.weekday()) % 7) or 7
    return hoy + timedelta(days=dias)


def _primera_clase_en_periodo(dia_semana: DiaSemana, desde: date) -> date:
    dias = (_DIA_TO_WEEKDAY[dia_semana] - desde.weekday()) % 7
    return desde + timedelta(days=dias)


def _calcular_fecha_fin(fecha_inicio: date) -> date:
    if fecha_inicio.day >= 29:
        return fecha_inicio + timedelta(days=29)
    month = fecha_inicio.month + 1
    year = fecha_inicio.year + (month - 1) // 12
    month = (month - 1) % 12 + 1
    return date(year, month, fecha_inicio.day) - timedelta(days=1)


def _calcular_fechas_clases(fecha_inicio: date, fecha_fin: date) -> list[date]:
    fechas = []
    current = fecha_inicio
    while current <= fecha_fin:
        fechas.append(current)
        current += timedelta(days=7)
    return fechas


def _ventana_renovacion(suscripcion) -> tuple[date, date]:
    return renewal_window(suscripcion.fecha_pago)


class SuscripcionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SuscripcionRepository(db)

    async def sync_suscripcion_state(self, suscripcion) -> None:
        today = datetime.now(LOCAL_TZ).date()
        current_state = get_subscription_state(suscripcion.estado)
        next_estado = current_state.next_state(suscripcion.fecha_pago, today)

        if next_estado != suscripcion.estado:
            await self.repo.mark_subscription_state(suscripcion, next_estado)
            if next_estado == EstadoSuscripcion.VENCIDA:
                await self.repo.release_future_reservas(suscripcion, today)
                await CuponDescuentoRepository(self.db).delete_unused_by_suscripcion(suscripcion.id)

    async def sync_template_subscriptions(self, clase_template_id: uuid.UUID) -> None:
        suscripciones = await self.repo.get_suscripciones_for_template(clase_template_id)
        for suscripcion in suscripciones:
            await self.sync_suscripcion_state(suscripcion)

    async def _create_period_reservas(
        self,
        suscripcion,
        template,
        fechas_clases: list[date],
        usuario_id: uuid.UUID,
    ) -> None:
        for fecha in fechas_clases:
            instancia = await self.repo.get_instancia(template.id, fecha)
            if instancia:
                instancia.cupo = max(0, instancia.cupo - 1)
            else:
                reservas = await self.repo.count_active_reservas_en_fecha(template.id, fecha)
                cupo = max(0, template.capacidad_maxima - reservas - 1)
                instancia = await self.repo.create_instancia(template.id, fecha, cupo)

            await self.repo.create_reserva(suscripcion.id, instancia.id)
            await self.repo.create_asistencia(usuario_id, instancia.id)

    async def _ensure_pending_renewal(self, suscripcion, today: date):
        if today <= suscripcion.fecha_fin:
            return None

        disponible_desde, disponible_hasta = _ventana_renovacion(suscripcion)
        if not (disponible_desde <= today <= disponible_hasta):
            return None

        existing_next = await self.repo.get_next_suscripcion_for_template(
            suscripcion.usuario_id,
            suscripcion.clase_template_id,
            suscripcion.fecha_fin,
        )
        if existing_next:
            return existing_next

        template = suscripcion.clase_template or await self.repo.get_template(suscripcion.clase_template_id)
        if not template or not template.activo:
            return None

        disciplina_obj = await DisciplinaRepository(self.db).get_by_nombre(template.disciplina)
        if not disciplina_obj:
            return None

        nueva_fecha_inicio = suscripcion.fecha_fin + timedelta(days=1)
        nueva_fecha_fin = _calcular_fecha_fin(nueva_fecha_inicio)
        primera_clase = _primera_clase_en_periodo(template.dia_semana, nueva_fecha_inicio)
        fechas_clases = _calcular_fechas_clases(primera_clase, nueva_fecha_fin)

        pending = await self.repo.create_suscripcion(
            usuario_id=suscripcion.usuario_id,
            clase_template_id=template.id,
            monto=Decimal(str(disciplina_obj.precio_suscripcion)),
            fecha_inicio=nueva_fecha_inicio,
            fecha_fin=nueva_fecha_fin,
            fecha_pago=suscripcion.fecha_pago,
            estado=EstadoSuscripcion.RENOVABLE,
        )
        await self._create_period_reservas(
            pending,
            template,
            fechas_clases,
            suscripcion.usuario_id,
        )
        return pending

    async def _validar_elegibilidad(
        self, current_user: Usuario, clase_template_id: uuid.UUID
    ) -> tuple:
        template = await self.repo.get_template(clase_template_id)
        if not template:
            raise NotFoundException("Clase no encontrada")

        await self.sync_template_subscriptions(clase_template_id)

        fecha_inicio = _proxima_fecha(template.dia_semana)
        fecha_fin = _calcular_fecha_fin(fecha_inicio)
        fechas_clases = _calcular_fechas_clases(fecha_inicio, fecha_fin)

        if await self.repo.has_suscripcion_activa(
            current_user.id, clase_template_id, fecha_inicio, fecha_fin
        ):
            raise ConflictException("Ya tenés una suscripción activa para esta clase")

        if await self.repo.has_conflicto_suscripcion(
            current_user.id,
            template.dia_semana,
            template.hora_inicio,
            template.hora_fin,
            fecha_inicio,
            fecha_fin,
            clase_template_id,
        ):
            raise ConflictException("Ya tenés otra inscripción en el mismo horario para esta fecha")

        conflicto_fecha = await self.repo.get_conflicto_individual(
            current_user.id, fechas_clases, template.hora_inicio, template.hora_fin
        )
        if conflicto_fecha:
            raise ConflictException(
                f"Tenés una inscripción individual en el mismo horario el {conflicto_fecha.strftime('%d/%m/%Y')}"
            )

        for fecha in fechas_clases:
            instancia = await self.repo.get_instancia(clase_template_id, fecha)
            if instancia:
                cupo_disponible = instancia.cupo
            else:
                reservas = await self.repo.count_active_reservas_en_fecha(clase_template_id, fecha)
                cupo_disponible = template.capacidad_maxima - reservas
            if cupo_disponible <= 0:
                raise BadRequestException(
                    f"No hay cupo disponible para suscripciones el {fecha.strftime('%d/%m/%Y')}"
                )

        return template, fecha_inicio, fecha_fin, fechas_clases

    async def check_elegibilidad(
        self, current_user: Usuario, clase_template_id: uuid.UUID
    ) -> SuscripcionCheckResponse:
        template, fecha_inicio, fecha_fin, fechas_clases = await self._validar_elegibilidad(
            current_user, clase_template_id
        )
        disciplina_obj = await DisciplinaRepository(self.db).get_by_nombre(template.disciplina)
        if not disciplina_obj:
            raise BadRequestException("No hay precio configurado para esta disciplina")
        precio = float(disciplina_obj.precio_suscripcion)
        porcentaje = await _get_porcentaje_sena(self.db)
        return SuscripcionCheckResponse(
            elegible=True,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            fechas_clases=fechas_clases,
            precio_total=precio,
            monto_minimo=round(precio * porcentaje / 100, 2),
        )

    async def _validar_renovacion(
        self, current_user: Usuario, suscripcion_id: uuid.UUID
    ) -> tuple:
        suscripcion = await self.repo.get_suscripcion_by_id_for_user(
            suscripcion_id, current_user.id
        )
        if not suscripcion or not suscripcion.clase_template:
            raise NotFoundException("Suscripción no encontrada")

        await self.sync_suscripcion_state(suscripcion)
        hoy = datetime.now(LOCAL_TZ).date()

        if await self.repo.has_paid_payment(suscripcion.id):
            pending = await self._ensure_pending_renewal(suscripcion, hoy)
            if not pending:
                raise BadRequestException("La renovación todavía no está disponible")
            suscripcion = await self.repo.get_suscripcion_by_id_for_user(
                pending.id, current_user.id
            )

        latest = await self.repo.get_latest_suscripcion_for_template(
            current_user.id, suscripcion.clase_template_id
        )
        if not latest or latest.id != suscripcion.id:
            raise BadRequestException("La suscripción ya fue renovada")

        # Subscription created by iniciar_renovacion: VIGENTE + PENDIENTE pago → bypass window
        if suscripcion.estado == EstadoSuscripcion.VIGENTE:
            if await self.repo.has_paid_payment(suscripcion.id):
                raise BadRequestException("La suscripción ya fue pagada")
            pago_repo = PagoRepository(self.db)
            if not await pago_repo.get_pendiente_by_suscripcion(suscripcion.id):
                raise BadRequestException("La renovación todavía no está disponible")
            template = suscripcion.clase_template
            if not template.activo:
                raise BadRequestException("La clase ya no está disponible")
            primera_clase = _primera_clase_en_periodo(template.dia_semana, suscripcion.fecha_inicio)
            fechas_clases = _calcular_fechas_clases(primera_clase, suscripcion.fecha_fin)
            disciplina_obj = await DisciplinaRepository(self.db).get_by_nombre(template.disciplina)
            if not disciplina_obj:
                raise BadRequestException("No hay precio configurado para esta disciplina")
            return (
                suscripcion,
                template,
                suscripcion.fecha_inicio,
                suscripcion.fecha_fin,
                fechas_clases,
                Decimal(str(disciplina_obj.precio_suscripcion)),
                hoy,
                hoy + timedelta(days=10),
            )

        disponible_desde, disponible_hasta = _ventana_renovacion(suscripcion)
        state = get_subscription_state(suscripcion.estado)
        if not state.can_renew():
            if suscripcion.estado == EstadoSuscripcion.VENCIDA:
                raise BadRequestException("El período de renovación venció")
            raise BadRequestException("La renovación todavía no está disponible")
        if hoy < disponible_desde:
            raise BadRequestException("La renovación todavía no está disponible")
        if hoy > disponible_hasta:
            raise BadRequestException("El período de renovación venció")
        if await self.repo.has_paid_payment(suscripcion.id):
            raise BadRequestException("La suscripción ya fue renovada")

        template = suscripcion.clase_template
        if not template.activo:
            raise BadRequestException("La clase ya no está disponible")

        primera_clase = _primera_clase_en_periodo(template.dia_semana, suscripcion.fecha_inicio)
        fechas_clases = _calcular_fechas_clases(primera_clase, suscripcion.fecha_fin)

        disciplina_obj = await DisciplinaRepository(self.db).get_by_nombre(template.disciplina)
        if not disciplina_obj:
            raise BadRequestException("No hay precio configurado para esta disciplina")

        return (
            suscripcion,
            template,
            suscripcion.fecha_inicio,
            suscripcion.fecha_fin,
            fechas_clases,
            Decimal(str(disciplina_obj.precio_suscripcion)),
            disponible_desde,
            disponible_hasta,
        )

    async def list_renovaciones_pendientes(
        self, current_user: Usuario
    ) -> list[RenovacionSuscripcionPendienteResponse]:
        suscripciones = await self.repo.get_suscripciones_for_renewal(current_user.id)
        latest_by_template = {}
        for suscripcion in suscripciones:
            latest_by_template.setdefault(suscripcion.clase_template_id, suscripcion)

        hoy = datetime.now(LOCAL_TZ).date()
        pendientes = []
        for suscripcion in latest_by_template.values():
            if not suscripcion.clase_template:
                continue
            if suscripcion.estado != EstadoSuscripcion.RENOVABLE:
                continue
            if await self.repo.has_paid_payment(suscripcion.id):
                continue

            disponible_desde, disponible_hasta = _ventana_renovacion(suscripcion)
            if not (disponible_desde <= hoy <= disponible_hasta):
                continue

            template = suscripcion.clase_template
            if not template.activo:
                continue

            disciplina_obj = await DisciplinaRepository(self.db).get_by_nombre(template.disciplina)
            if not disciplina_obj:
                continue

            cantidad_clases = len(_calcular_fechas_clases(suscripcion.fecha_inicio, suscripcion.fecha_fin))

            pendientes.append(RenovacionSuscripcionPendienteResponse(
                suscripcion_id=suscripcion.id,
                clase_template_id=template.id,
                clase_nombre=template.nombre,
                disciplina=template.disciplina,
                fecha_inicio=suscripcion.fecha_inicio,
                fecha_fin=suscripcion.fecha_fin,
                renovacion_disponible_desde=disponible_desde,
                renovacion_disponible_hasta=disponible_hasta,
                nueva_fecha_inicio=suscripcion.fecha_inicio,
                nueva_fecha_fin=suscripcion.fecha_fin,
                cantidad_clases=cantidad_clases,
                precio_total=float(disciplina_obj.precio_suscripcion),
            ))

        # Also include VIGENTE subscriptions with a PENDIENTE pago (created by iniciar_renovacion)
        pago_repo = PagoRepository(self.db)
        for suscripcion in latest_by_template.values():
            if suscripcion.estado != EstadoSuscripcion.VIGENTE:
                continue
            if await self.repo.has_paid_payment(suscripcion.id):
                continue
            if not await pago_repo.get_pendiente_by_suscripcion(suscripcion.id):
                continue
            template = suscripcion.clase_template
            if not template or not template.activo:
                continue
            disciplina_obj = await DisciplinaRepository(self.db).get_by_nombre(template.disciplina)
            if not disciplina_obj:
                continue
            cantidad_clases = len(_calcular_fechas_clases(suscripcion.fecha_inicio, suscripcion.fecha_fin))
            pendientes.append(RenovacionSuscripcionPendienteResponse(
                suscripcion_id=suscripcion.id,
                clase_template_id=template.id,
                clase_nombre=template.nombre,
                disciplina=template.disciplina,
                fecha_inicio=suscripcion.fecha_inicio,
                fecha_fin=suscripcion.fecha_fin,
                renovacion_disponible_desde=hoy,
                renovacion_disponible_hasta=hoy + timedelta(days=10),
                nueva_fecha_inicio=suscripcion.fecha_inicio,
                nueva_fecha_fin=suscripcion.fecha_fin,
                cantidad_clases=cantidad_clases,
                precio_total=float(disciplina_obj.precio_suscripcion),
            ))

        return pendientes

    async def iniciar_renovacion(
        self, current_user: Usuario, suscripcion_id: uuid.UUID
    ) -> RenovacionIniciadaResponse:
        suscripcion = await self.repo.get_suscripcion_by_id_for_user(suscripcion_id, current_user.id)
        if not suscripcion:
            raise NotFoundException("Suscripción no encontrada")

        today = datetime.now(LOCAL_TZ).date()
        if today <= suscripcion.fecha_fin:
            raise BadRequestException("El ciclo actual todavía tiene clases pendientes")

        template = suscripcion.clase_template or await self.repo.get_template(suscripcion.clase_template_id)
        if not template or not template.activo:
            raise BadRequestException("La clase ya no está disponible")

        disciplina_obj = await DisciplinaRepository(self.db).get_by_nombre(template.disciplina)
        if not disciplina_obj:
            raise BadRequestException("No hay precio configurado para esta disciplina")

        # Idempotent: check if next period already exists
        existing_next = await self.repo.get_next_suscripcion_for_template(
            current_user.id, suscripcion.clase_template_id, suscripcion.fecha_fin
        )

        if suscripcion.activo:
            suscripcion.activo = False
            await self.db.flush()

        if not existing_next:
            nueva_fecha_inicio = suscripcion.fecha_fin + timedelta(days=1)
            nueva_fecha_fin = _calcular_fecha_fin(nueva_fecha_inicio)
            primera_clase = _primera_clase_en_periodo(template.dia_semana, nueva_fecha_inicio)
            fechas_clases = _calcular_fechas_clases(primera_clase, nueva_fecha_fin)

            existing_next = await self.repo.create_suscripcion(
                usuario_id=current_user.id,
                clase_template_id=template.id,
                monto=Decimal(str(disciplina_obj.precio_suscripcion)),
                fecha_inicio=nueva_fecha_inicio,
                fecha_fin=nueva_fecha_fin,
                fecha_pago=datetime.now(LOCAL_TZ).date(),
                estado=EstadoSuscripcion.VIGENTE,
            )
            await self._create_period_reservas(existing_next, template, fechas_clases, current_user.id)

        pago_repo = PagoRepository(self.db)
        pago_existente = await pago_repo.get_pendiente_by_suscripcion(existing_next.id)
        if not pago_existente and not await self.repo.has_paid_payment(existing_next.id):
            await self.repo.create_pago(
                usuario_id=current_user.id,
                suscripcion_id=existing_next.id,
                monto=Decimal(str(disciplina_obj.precio_suscripcion)),
                mp_payment_id="pendiente",
                estado=EstadoPago.PENDIENTE,
            )

        return RenovacionIniciadaResponse(
            siguiente_suscripcion_id=existing_next.id,
            clase_nombre=template.nombre,
            fecha_inicio=existing_next.fecha_inicio,
            fecha_fin=existing_next.fecha_fin,
            precio_total=float(existing_next.monto),
        )

    async def renovar_todas_vencidas(self) -> dict:
        today = datetime.now(LOCAL_TZ).date()
        suscripciones = await self.repo.get_activas_con_clases_finalizadas(today)
        procesadas = 0
        creadas = 0
        errores = 0

        for suscripcion in suscripciones:
            try:
                template = suscripcion.clase_template or await self.repo.get_template(suscripcion.clase_template_id)
                if not template or not template.activo:
                    procesadas += 1
                    continue

                disciplina_obj = await DisciplinaRepository(self.db).get_by_nombre(template.disciplina)
                if not disciplina_obj:
                    procesadas += 1
                    continue

                existing_next = await self.repo.get_next_suscripcion_for_template(
                    suscripcion.usuario_id, suscripcion.clase_template_id, suscripcion.fecha_fin
                )

                if suscripcion.activo:
                    suscripcion.activo = False
                    await self.db.flush()

                if not existing_next:
                    nueva_fecha_inicio = suscripcion.fecha_fin + timedelta(days=1)
                    nueva_fecha_fin = _calcular_fecha_fin(nueva_fecha_inicio)
                    primera_clase = _primera_clase_en_periodo(template.dia_semana, nueva_fecha_inicio)
                    fechas_clases = _calcular_fechas_clases(primera_clase, nueva_fecha_fin)

                    existing_next = await self.repo.create_suscripcion(
                        usuario_id=suscripcion.usuario_id,
                        clase_template_id=template.id,
                        monto=Decimal(str(disciplina_obj.precio_suscripcion)),
                        fecha_inicio=nueva_fecha_inicio,
                        fecha_fin=nueva_fecha_fin,
                        fecha_pago=today,
                        estado=EstadoSuscripcion.VIGENTE,
                    )
                    await self._create_period_reservas(existing_next, template, fechas_clases, suscripcion.usuario_id)
                    creadas += 1

                pago_repo = PagoRepository(self.db)
                pago_existente = await pago_repo.get_pendiente_by_suscripcion(existing_next.id)
                if not pago_existente and not await self.repo.has_paid_payment(existing_next.id):
                    await self.repo.create_pago(
                        usuario_id=suscripcion.usuario_id,
                        suscripcion_id=existing_next.id,
                        monto=Decimal(str(disciplina_obj.precio_suscripcion)),
                        mp_payment_id="pendiente",
                        estado=EstadoPago.PENDIENTE,
                    )

                procesadas += 1
            except Exception:
                errores += 1

        return {"procesadas": procesadas, "creadas": creadas, "errores": errores}

    async def procesar_renovaciones_cron(self) -> dict:
        suscripciones = await self.repo.get_all_activas()
        procesadas = 0
        vencidas = 0
        for suscripcion in suscripciones:
            estado_anterior = suscripcion.estado
            await self.sync_suscripcion_state(suscripcion)
            if suscripcion.estado == EstadoSuscripcion.VENCIDA and estado_anterior != EstadoSuscripcion.VENCIDA:
                vencidas += 1
            procesadas += 1
        renovadas = await self.renovar_todas_vencidas()
        return {"procesadas": procesadas, "vencidas": vencidas, "renovadas": renovadas["creadas"]}

    async def renovar_suscripcion(
        self,
        current_user: Usuario,
        suscripcion_id: uuid.UUID,
        monto: Decimal,
        mp_payment_id: str = "mock",
    ) -> SuscripcionResponse:
        (
            suscripcion_anterior,
            template,
            fecha_inicio,
            fecha_fin,
            fechas_clases,
            precio,
            _disponible_desde,
            _disponible_hasta,
        ) = await self._validar_renovacion(current_user, suscripcion_id)

        cupon_repo = CuponDescuentoRepository(self.db)
        cupones = await cupon_repo.list_unused_for_renewal(current_user.id, template.id)
        descuento_total = sum(float(c.descuento_porcentaje) for c in cupones)
        precio_esperado = Decimal(str(max(round(float(precio) * (1 - descuento_total / 100), 2), 0.01)))

        if abs(monto - precio_esperado) > Decimal("0.02"):
            raise BadRequestException(
                f"El monto debe ser ${float(precio_esperado):.2f}"
            )

        suscripcion = suscripcion_anterior
        suscripcion.monto = monto
        suscripcion.fecha_pago = datetime.now(LOCAL_TZ).date()
        await self.repo.mark_subscription_state(suscripcion, EstadoSuscripcion.VIGENTE)

        await cupon_repo.mark_used(cupones)
        await PagoRepository(self.db).cancel_pending_by_suscripcion(suscripcion.id)

        pago = await self.repo.create_pago(
            usuario_id=current_user.id,
            suscripcion_id=suscripcion.id,
            monto=monto,
            mp_payment_id=mp_payment_id,
        )

        return SuscripcionResponse(
            id=suscripcion.id,
            clase_template_id=suscripcion.clase_template_id,
            pago_id=pago.id,
            monto=float(suscripcion.monto),
            fecha_inicio=suscripcion.fecha_inicio,
            fecha_fin=suscripcion.fecha_fin,
            fecha_pago=suscripcion.fecha_pago,
            estado=suscripcion.estado,
            fechas_clases=fechas_clases,
            activo=suscripcion.activo,
        )

    async def suscribirse(
        self, current_user: Usuario, data: SuscripcionCreate, mp_payment_id: str = "mock"
    ) -> SuscripcionResponse:
        clase_template_id = uuid.UUID(str(data.clase_template_id))
        template, fecha_inicio, fecha_fin, fechas_clases = await self._validar_elegibilidad(
            current_user, clase_template_id
        )

        disciplina_obj = await DisciplinaRepository(self.db).get_by_nombre(template.disciplina)
        if not disciplina_obj:
            raise BadRequestException("No hay precio configurado para esta disciplina")
        precio = Decimal(str(disciplina_obj.precio_suscripcion))
        porcentaje = await _get_porcentaje_sena(self.db)
        monto_minimo = precio * Decimal(str(porcentaje)) / 100

        if data.monto < monto_minimo:
            raise BadRequestException(
                f"El monto mínimo es el {int(porcentaje)}% del precio: ${float(monto_minimo):.2f}"
            )
        if data.monto > precio:
            raise BadRequestException(
                f"El monto no puede superar el precio de la suscripción: ${float(precio):.2f}"
            )

        suscripcion = await self.repo.create_suscripcion(
            usuario_id=current_user.id,
            clase_template_id=clase_template_id,
            monto=data.monto,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            fecha_pago=datetime.now(LOCAL_TZ).date(),
        )

        for fecha in fechas_clases:
            instancia = await self.repo.get_instancia(clase_template_id, fecha)
            if instancia:
                instancia.cupo = max(0, instancia.cupo - 1)
            else:
                reservas = await self.repo.count_active_reservas_en_fecha(clase_template_id, fecha)
                cupo = max(0, template.capacidad_maxima - reservas - 1)
                instancia = await self.repo.create_instancia(clase_template_id, fecha, cupo)

            await self.repo.create_reserva(suscripcion.id, instancia.id)
            await self.repo.create_asistencia(current_user.id, instancia.id)

        pago = await self.repo.create_pago(
            usuario_id=current_user.id,
            suscripcion_id=suscripcion.id,
            monto=data.monto,
            mp_payment_id=mp_payment_id,
        )

        return SuscripcionResponse(
            id=suscripcion.id,
            clase_template_id=suscripcion.clase_template_id,
            pago_id=pago.id,
            monto=float(suscripcion.monto),
            fecha_inicio=suscripcion.fecha_inicio,
            fecha_fin=suscripcion.fecha_fin,
            fecha_pago=suscripcion.fecha_pago,
            estado=suscripcion.estado,
            fechas_clases=fechas_clases,
            activo=suscripcion.activo,
        )
