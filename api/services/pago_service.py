from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

import mercadopago
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.config import settings
from core.enums import EstadoPago, TipoInscripcion
from core.timezone import LOCAL_TZ
from exceptions.general import BadRequestException, NotFoundException
from models.asistencia import Asistencia
from models.pagos import Pago
from models.usuario import Usuario
from repositories.cupon_descuento_repository import CuponDescuentoRepository
from repositories.pago_repository import PagoRepository
from repositories.inscripcion_repository import InscripcionRepository
from repositories.disciplina_repository import DisciplinaRepository
from repositories.configuracion_repository import ConfiguracionRepository
from schemas.inscripcion import InscripcionIndividualCreate
from schemas.pago import DeudaPendienteResponse, MiPagoResponse
from schemas.suscripcion import SuscripcionCreate
from services.inscripcion_service import InscripcionService
from services.suscripcion_service import SuscripcionService


async def _get_porcentaje_sena(db) -> float:
    config = await ConfiguracionRepository(db).get_by_clave("sena_minima")
    try:
        return float(config.valor) if config else 50.0
    except (ValueError, TypeError):
        return 50.0


def _deuda_saldable(fecha: date, hora_inicio) -> bool:
    clase_inicio = datetime.combine(fecha, hora_inicio, tzinfo=LOCAL_TZ)
    return clase_inicio - datetime.now(LOCAL_TZ) > timedelta(hours=24)


class PagoService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PagoRepository(db)
        self._sdk: mercadopago.SDK | None = None

    @property
    def sdk(self) -> mercadopago.SDK:
        if not settings.MP_ACCESS_TOKEN:
            raise BadRequestException("Los pagos con MercadoPago no están configurados")
        if not self._sdk:
            self._sdk = mercadopago.SDK(settings.MP_ACCESS_TOKEN)
        return self._sdk

    async def get_mis_pagos(self, current_user: Usuario) -> list[MiPagoResponse]:
        pagos = await self.repo.list_by_usuario(current_user.id)
        historial = []

        for pago in pagos:
            clase_template = None
            tipo = "otro"

            if pago.suscripcion and pago.suscripcion.clase_template:
                clase_template = pago.suscripcion.clase_template
                tipo = "suscripcion"
            elif pago.clase_instancia and pago.clase_instancia.clase_template:
                clase_template = pago.clase_instancia.clase_template
                tipo = "individual"

            historial.append(MiPagoResponse(
                id=pago.id,
                monto=float(pago.monto),
                fecha_pago=pago.fecha_pago,
                estado=pago.estado,
                mp_payment_id=pago.mp_payment_id,
                descripcion=pago.descripcion,
                tipo=tipo,
                clase_nombre=clase_template.nombre if clase_template else None,
                disciplina=clase_template.disciplina if clase_template else None,
            ))

        return historial

    async def list_deudas_pendientes(
        self, current_user: Usuario
    ) -> list[DeudaPendienteResponse]:
        from models.clase_instancia import ClaseInstancia
        from models.clase_template import ClaseTemplate
        from models.disciplina import Disciplina

        await self.sync_expired_partial_debts(current_user.id)

        monto_pagado_sq = (
            select(func.coalesce(func.sum(Pago.monto), 0))
            .where(
                Pago.usuario_id == current_user.id,
                Pago.clase_instancia_id == Asistencia.clase_instancia_id,
                Pago.activo == True,
                Pago.estado == EstadoPago.PAGADO,
            )
            .correlate(Asistencia)
            .scalar_subquery()
        )

        stmt = (
            select(
                Asistencia.id.label("asistencia_id"),
                ClaseTemplate.nombre.label("clase_nombre"),
                ClaseTemplate.disciplina,
                ClaseTemplate.hora_inicio,
                ClaseInstancia.fecha,
                monto_pagado_sq.label("monto_pagado"),
                Disciplina.precio_individual.label("precio_total"),
            )
            .join(ClaseInstancia, Asistencia.clase_instancia_id == ClaseInstancia.id)
            .join(ClaseTemplate, ClaseInstancia.clase_template_id == ClaseTemplate.id)
            .join(Disciplina, Disciplina.nombre == ClaseTemplate.disciplina)
            .where(
                Asistencia.usuario_id == current_user.id,
                Asistencia.tipo == TipoInscripcion.INDIVIDUAL,
                Asistencia.cancelo == False,
            )
            .order_by(ClaseInstancia.fecha.asc(), ClaseTemplate.hora_inicio.asc())
        )

        rows = (await self.db.execute(stmt)).all()
        pendientes: list[DeudaPendienteResponse] = []
        for row in rows:
            monto_pagado = Decimal(str(row.monto_pagado or 0))
            precio_total = Decimal(str(row.precio_total or 0))
            monto_restante = precio_total - monto_pagado
            if monto_pagado <= 0 or monto_restante <= 0:
                continue
            if not _deuda_saldable(row.fecha, row.hora_inicio):
                continue

            pendientes.append(DeudaPendienteResponse(
                asistencia_id=row.asistencia_id,
                clase_nombre=row.clase_nombre,
                disciplina=row.disciplina,
                fecha=datetime.combine(row.fecha, row.hora_inicio),
                hora_inicio=row.hora_inicio.strftime("%H:%M"),
                monto_pagado=float(monto_pagado),
                precio_total=float(precio_total),
                monto_restante=float(monto_restante),
            ))

        return pendientes

    async def sync_expired_partial_debts(self, usuario_id: UUID | None = None) -> None:
        from models.clase_instancia import ClaseInstancia
        from models.clase_template import ClaseTemplate
        from models.disciplina import Disciplina

        monto_pagado_sq = (
            select(func.coalesce(func.sum(Pago.monto), 0))
            .where(
                Pago.usuario_id == Asistencia.usuario_id,
                Pago.clase_instancia_id == Asistencia.clase_instancia_id,
                Pago.activo == True,
                Pago.estado == EstadoPago.PAGADO,
            )
            .correlate(Asistencia)
            .scalar_subquery()
        )

        stmt = (
            select(
                Asistencia,
                ClaseInstancia,
                ClaseTemplate,
                monto_pagado_sq.label("monto_pagado"),
                Disciplina.precio_individual.label("precio_total"),
            )
            .join(ClaseInstancia, Asistencia.clase_instancia_id == ClaseInstancia.id)
            .join(ClaseTemplate, ClaseInstancia.clase_template_id == ClaseTemplate.id)
            .join(Disciplina, Disciplina.nombre == ClaseTemplate.disciplina)
            .where(
                Asistencia.tipo == TipoInscripcion.INDIVIDUAL,
                Asistencia.cancelo == False,
            )
        )
        if usuario_id:
            stmt = stmt.where(Asistencia.usuario_id == usuario_id)

        rows = (await self.db.execute(stmt)).all()
        released_any = False
        for asistencia, instancia, template, monto_pagado_raw, precio_total_raw in rows:
            monto_pagado = Decimal(str(monto_pagado_raw or 0))
            precio_total = Decimal(str(precio_total_raw or 0))
            monto_restante = precio_total - monto_pagado

            if monto_pagado <= 0 or monto_restante <= 0:
                continue
            if _deuda_saldable(instancia.fecha, template.hora_inicio):
                continue

            self._release_partial_debt_reservation(asistencia, instancia)
            released_any = True

        if released_any:
            await self.db.flush()

    def _release_partial_debt_reservation(self, asistencia: Asistencia, instancia) -> None:
        asistencia.cancelo = True
        instancia.cupo += 1

    async def _record_failed_mp_payment(
        self,
        current_user: Usuario,
        payment_id: str,
        payment: dict,
        descripcion: str,
    ) -> None:
        monto = Decimal(str(payment.get("transaction_amount") or 0))
        await self.repo.create_failed_mp(
            usuario_id=current_user.id,
            payment_id=str(payment_id),
            monto=monto,
            descripcion=descripcion,
        )

    async def crear_preferencia_mp(
        self,
        current_user: Usuario,
        clase_template_id: UUID,
        fecha: date,
        monto: float,
    ) -> dict:
        await InscripcionService(self.db).check_elegibilidad(current_user, clase_template_id, fecha)

        repo = InscripcionRepository(self.db)
        template = await repo.get_template(clase_template_id)
        if not template:
            raise NotFoundException("Clase no encontrada")

        disciplina_obj = await DisciplinaRepository(self.db).get_by_nombre(template.disciplina)
        if not disciplina_obj:
            raise BadRequestException("No hay precio configurado para esta disciplina")

        precio = float(disciplina_obj.precio_individual)
        porcentaje = await _get_porcentaje_sena(self.db)
        monto_minimo = precio * porcentaje / 100

        if monto < monto_minimo:
            raise BadRequestException(f"El monto mínimo es ${monto_minimo:.2f}")
        if monto > precio:
            raise BadRequestException(f"El monto no puede superar el precio de la clase: ${precio:.2f}")

        dia = template.dia_semana.value.capitalize()
        hora = template.hora_inicio.strftime("%H:%M")
        frontend_url = settings.FRONTEND_PUBLIC_URL.rstrip("/")

        preference_data: dict = {
            "items": [{
                "title": f"{template.nombre} — {dia} {hora}",
                "quantity": 1,
                "unit_price": round(monto, 2),
                "currency_id": "ARS",
            }],
            "back_urls": {
                "success": f"{frontend_url}/pago/retorno",
                "failure": f"{frontend_url}/pago/retorno",
                "pending": f"{frontend_url}/pago/retorno",
            },
            "auto_return": "approved",
            "metadata": {
                "clase_template_id": str(clase_template_id),
                "fecha": str(fecha),
                "usuario_id": str(current_user.id),
            },
            "external_reference": f"{clase_template_id}|{fecha}|{current_user.id}",
        }

        if settings.MP_NOTIFICATION_URL:
            preference_data["notification_url"] = settings.MP_NOTIFICATION_URL

        response = self.sdk.preference().create(preference_data)
        if response["status"] not in (200, 201):
            raise BadRequestException("Error al conectar con MercadoPago")

        pref = response["response"]
        is_sandbox = settings.MP_ACCESS_TOKEN.startswith("TEST-")
        init_point = pref.get("sandbox_init_point") if is_sandbox else pref.get("init_point")

        return {
            "init_point": init_point,
            "preference_id": pref["id"],
        }

    async def confirmar_pago_mp(
        self,
        current_user: Usuario,
        payment_id: str,
    ) -> dict:
        payment_response = self.sdk.payment().get(payment_id)
        if payment_response["status"] != 200:
            raise NotFoundException("Pago no encontrado en MercadoPago")

        payment = payment_response["response"]
        status = payment.get("status")

        if status not in ("approved", "pending"):
            await self._record_failed_mp_payment(
                current_user,
                payment_id,
                payment,
                "Pago individual no completado",
            )
            return {"status": status}

        existing = await self.db.execute(
            select(Pago).where(Pago.mp_payment_id == str(payment_id))
        )
        if existing.scalars().first():
            return {"status": "approved", "already_processed": True}

        # Prefer metadata; fall back to external_reference
        metadata = payment.get("metadata", {})
        external_ref = payment.get("external_reference", "")
        try:
            if metadata.get("clase_template_id"):
                clase_template_id = UUID(str(metadata["clase_template_id"]))
                fecha = date.fromisoformat(str(metadata["fecha"]))
                usuario_id = str(metadata["usuario_id"])
            else:
                parts = external_ref.split("|")
                clase_template_id = UUID(parts[0])
                fecha = date.fromisoformat(parts[1])
                usuario_id = parts[2]
        except (KeyError, ValueError, IndexError):
            raise BadRequestException("Metadatos del pago inválidos")

        if str(current_user.id) != usuario_id:
            raise BadRequestException("Este pago no corresponde a tu usuario")

        monto = Decimal(str(payment["transaction_amount"]))
        data = InscripcionIndividualCreate(
            clase_template_id=clase_template_id,
            fecha=fecha,
            monto=monto,
        )

        result = await InscripcionService(self.db).inscribir_individual(
            current_user, data, mp_payment_id=str(payment_id)
        )

        return {"status": "approved", **result.model_dump()}

    def _make_preference(
        self,
        title: str,
        monto: float,
        back_url_suffix: str,
        metadata: dict,
        external_reference: str,
    ) -> dict:
        frontend_url = settings.FRONTEND_PUBLIC_URL.rstrip("/")
        back_url = f"{frontend_url}/pago/retorno{back_url_suffix}"
        data: dict = {
            "items": [{"title": title, "quantity": 1, "unit_price": round(monto, 2), "currency_id": "ARS"}],
            "back_urls": {"success": back_url, "failure": back_url, "pending": back_url},
            "auto_return": "approved",
            "metadata": metadata,
            "external_reference": external_reference,
        }
        if settings.MP_NOTIFICATION_URL:
            data["notification_url"] = settings.MP_NOTIFICATION_URL
        return data

    def _init_point_from_response(self, pref: dict) -> str:
        is_sandbox = settings.MP_ACCESS_TOKEN.startswith("TEST-")
        return pref.get("sandbox_init_point") if is_sandbox else pref.get("init_point")

    async def crear_preferencia_deuda_mp(
        self,
        current_user: Usuario,
        asistencia_id: UUID,
    ) -> dict:
        from models.clase_instancia import ClaseInstancia
        from models.clase_template import ClaseTemplate

        stmt = (
            select(Asistencia, ClaseInstancia, ClaseTemplate)
            .join(ClaseInstancia, Asistencia.clase_instancia_id == ClaseInstancia.id)
            .join(ClaseTemplate, ClaseInstancia.clase_template_id == ClaseTemplate.id)
            .where(
                Asistencia.id == asistencia_id,
                Asistencia.usuario_id == current_user.id,
                Asistencia.cancelo == False,
            )
        )
        row = (await self.db.execute(stmt)).first()
        if not row:
            raise NotFoundException("Asistencia no encontrada")

        asistencia, instancia, template = row

        if not _deuda_saldable(instancia.fecha, template.hora_inicio):
            self._release_partial_debt_reservation(asistencia, instancia)
            await self.db.flush()
            raise BadRequestException("Ya no puedes completar el pago faltando menos de 24hs")

        total_pagado = Decimal(str(
            (await self.db.execute(
                select(func.coalesce(func.sum(Pago.monto), 0))
                .where(
                    Pago.usuario_id == current_user.id,
                    Pago.clase_instancia_id == asistencia.clase_instancia_id,
                    Pago.activo == True,
                )
            )).scalar()
        ))

        precio_disc = await DisciplinaRepository(self.db).get_by_nombre(template.disciplina)
        if not precio_disc:
            raise BadRequestException("No hay precio configurado para esta disciplina")

        precio_total = Decimal(str(precio_disc.precio_individual))
        monto_restante = precio_total - total_pagado

        if monto_restante <= 0:
            raise BadRequestException("No tenés deuda pendiente para esta clase")

        dia = template.dia_semana.value.capitalize()
        hora = template.hora_inicio.strftime("%H:%M")
        pref_data = self._make_preference(
            title=f"Saldo — {template.nombre} {dia} {hora}",
            monto=float(monto_restante),
            back_url_suffix="?tipo=deuda",
            metadata={"asistencia_id": str(asistencia_id), "usuario_id": str(current_user.id), "tipo": "deuda"},
            external_reference=f"deuda|{asistencia_id}|{current_user.id}",
        )

        response = self.sdk.preference().create(pref_data)
        if response["status"] not in (200, 201):
            raise BadRequestException("Error al conectar con MercadoPago")

        pref = response["response"]
        return {
            "init_point": self._init_point_from_response(pref),
            "preference_id": pref["id"],
            "monto_restante": float(monto_restante),
        }

    async def confirmar_deuda_mp(
        self,
        current_user: Usuario,
        payment_id: str,
    ) -> dict:
        payment_response = self.sdk.payment().get(payment_id)
        if payment_response["status"] != 200:
            raise NotFoundException("Pago no encontrado en MercadoPago")

        payment = payment_response["response"]
        if payment.get("status") not in ("approved", "pending"):
            await self._record_failed_mp_payment(
                current_user,
                payment_id,
                payment,
                "Pago saldo pendiente no completado",
            )
            return {"status": payment.get("status")}

        existing = await self.db.execute(
            select(Pago).where(Pago.mp_payment_id == str(payment_id))
        )
        if existing.scalars().first():
            return {"status": "approved", "already_processed": True}

        metadata = payment.get("metadata", {})
        external_ref = payment.get("external_reference", "")
        try:
            if metadata.get("asistencia_id"):
                asistencia_id = UUID(str(metadata["asistencia_id"]))
                usuario_id = str(metadata["usuario_id"])
            else:
                parts = external_ref.split("|")
                asistencia_id = UUID(parts[1])
                usuario_id = parts[2]
        except (KeyError, ValueError, IndexError):
            raise BadRequestException("Metadatos del pago inválidos")

        if str(current_user.id) != usuario_id:
            raise BadRequestException("Este pago no corresponde a tu usuario")

        asistencia = (await self.db.execute(
            select(Asistencia).where(
                Asistencia.id == asistencia_id,
                Asistencia.usuario_id == current_user.id,
            )
        )).scalars().first()
        if not asistencia:
            raise NotFoundException("Asistencia no encontrada")

        from models.clase_instancia import ClaseInstancia
        from models.clase_template import ClaseTemplate

        row = (await self.db.execute(
            select(ClaseInstancia, ClaseTemplate)
            .join(ClaseTemplate, ClaseInstancia.clase_template_id == ClaseTemplate.id)
            .where(ClaseInstancia.id == asistencia.clase_instancia_id)
        )).first()
        if not row:
            raise NotFoundException("Clase no encontrada")

        instancia, template = row
        if asistencia.cancelo:
            raise BadRequestException("La reserva ya no esta disponible")
        if not _deuda_saldable(instancia.fecha, template.hora_inicio):
            self._release_partial_debt_reservation(asistencia, instancia)
            await self.db.flush()
            raise BadRequestException("Ya no puedes completar el pago faltando menos de 24hs")

        pago = Pago(
            usuario_id=current_user.id,
            clase_instancia_id=asistencia.clase_instancia_id,
            monto=Decimal(str(payment["transaction_amount"])),
            fecha_pago=datetime.now(timezone.utc),
            estado=EstadoPago.PAGADO,
            mp_payment_id=str(payment_id),
            descripcion="Pago saldo pendiente",
            activo=True,
        )
        self.db.add(pago)
        await self.db.flush()

        return {"status": "approved", "pago_id": str(pago.id)}

    async def crear_preferencia_suscripcion_mp(
        self,
        current_user: Usuario,
        clase_template_id: UUID,
        monto: float,
    ) -> dict:
        await SuscripcionService(self.db).check_elegibilidad(current_user, clase_template_id)

        repo = InscripcionRepository(self.db)
        template = await repo.get_template(clase_template_id)
        if not template:
            raise NotFoundException("Clase no encontrada")

        precio_disc = await DisciplinaRepository(self.db).get_by_nombre(template.disciplina)
        if not precio_disc:
            raise BadRequestException("No hay precio configurado para esta disciplina")

        precio = float(precio_disc.precio_suscripcion)
        if round(monto, 2) != round(precio, 2):
            raise BadRequestException(f"El monto debe ser el precio completo: ${precio:.2f}")

        dia = template.dia_semana.value.capitalize()
        pref_data = self._make_preference(
            title=f"Suscripción — {template.nombre} {dia}",
            monto=round(monto, 2),
            back_url_suffix="?tipo=suscripcion",
            metadata={"clase_template_id": str(clase_template_id), "usuario_id": str(current_user.id), "tipo": "suscripcion"},
            external_reference=f"suscripcion|{clase_template_id}|{current_user.id}",
        )

        response = self.sdk.preference().create(pref_data)
        if response["status"] not in (200, 201):
            raise BadRequestException("Error al conectar con MercadoPago")

        pref = response["response"]
        return {
            "init_point": self._init_point_from_response(pref),
            "preference_id": pref["id"],
        }

    async def crear_preferencia_renovacion_suscripcion_mp(
        self,
        current_user: Usuario,
        suscripcion_id: UUID,
    ) -> dict:
        (
            _suscripcion,
            template,
            _fecha_inicio,
            _fecha_fin,
            _fechas_clases,
            precio,
            _disponible_desde,
            _disponible_hasta,
        ) = await SuscripcionService(self.db)._validar_renovacion(current_user, suscripcion_id)

        cupones = await CuponDescuentoRepository(self.db).list_unused_for_renewal(
            current_user.id, template.id
        )
        descuento_total = sum(float(c.descuento_porcentaje) for c in cupones)
        precio_final = round(float(precio) * (1 - descuento_total / 100), 2)
        precio_final = max(precio_final, 0.01)

        dia = template.dia_semana.value.capitalize()
        pref_data = self._make_preference(
            title=f"Renovación suscripción — {template.nombre} {dia}",
            monto=precio_final,
            back_url_suffix="?tipo=renovacion-suscripcion",
            metadata={
                "suscripcion_id": str(suscripcion_id),
                "usuario_id": str(current_user.id),
                "tipo": "renovacion_suscripcion",
            },
            external_reference=f"renovacion_suscripcion|{suscripcion_id}|{current_user.id}",
        )

        response = self.sdk.preference().create(pref_data)
        if response["status"] not in (200, 201):
            raise BadRequestException("Error al conectar con MercadoPago")

        pref = response["response"]
        return {
            "init_point": self._init_point_from_response(pref),
            "preference_id": pref["id"],
        }

    async def confirmar_suscripcion_mp(
        self,
        current_user: Usuario,
        payment_id: str,
    ) -> dict:
        payment_response = self.sdk.payment().get(payment_id)
        if payment_response["status"] != 200:
            raise NotFoundException("Pago no encontrado en MercadoPago")

        payment = payment_response["response"]
        if payment.get("status") == "pending":
            return {"status": "pending"}

        if payment.get("status") != "approved":
            await self._record_failed_mp_payment(
                current_user,
                payment_id,
                payment,
                "Pago suscripcion no completado",
            )
            return {"status": payment.get("status")}

        existing = await self.db.execute(
            select(Pago).where(Pago.mp_payment_id == str(payment_id))
        )
        if existing.scalars().first():
            return {"status": "approved", "already_processed": True}

        metadata = payment.get("metadata", {})
        external_ref = payment.get("external_reference", "")
        try:
            if metadata.get("clase_template_id"):
                clase_template_id = UUID(str(metadata["clase_template_id"]))
                usuario_id = str(metadata["usuario_id"])
            else:
                parts = external_ref.split("|")
                clase_template_id = UUID(parts[1])
                usuario_id = parts[2]
        except (KeyError, ValueError, IndexError):
            raise BadRequestException("Metadatos del pago inválidos")

        if str(current_user.id) != usuario_id:
            raise BadRequestException("Este pago no corresponde a tu usuario")

        monto = Decimal(str(payment["transaction_amount"]))
        data = SuscripcionCreate(clase_template_id=clase_template_id, monto=monto)
        result = await SuscripcionService(self.db).suscribirse(
            current_user, data, mp_payment_id=str(payment_id)
        )

        return {"status": "approved", **result.model_dump()}

    async def confirmar_renovacion_suscripcion_mp(
        self,
        current_user: Usuario,
        payment_id: str,
    ) -> dict:
        payment_response = self.sdk.payment().get(payment_id)
        if payment_response["status"] != 200:
            raise NotFoundException("Pago no encontrado en MercadoPago")

        payment = payment_response["response"]
        if payment.get("status") == "pending":
            return {"status": "pending"}

        if payment.get("status") != "approved":
            await self._record_failed_mp_payment(
                current_user,
                payment_id,
                payment,
                "Renovación suscripción no completada",
            )
            return {"status": payment.get("status")}

        existing = await self.db.execute(
            select(Pago).where(Pago.mp_payment_id == str(payment_id))
        )
        if existing.scalars().first():
            return {"status": "approved", "already_processed": True}

        metadata = payment.get("metadata", {})
        external_ref = payment.get("external_reference", "")
        try:
            if metadata.get("suscripcion_id"):
                suscripcion_id = UUID(str(metadata["suscripcion_id"]))
                usuario_id = str(metadata["usuario_id"])
            else:
                parts = external_ref.split("|")
                suscripcion_id = UUID(parts[1])
                usuario_id = parts[2]
        except (KeyError, ValueError, IndexError):
            raise BadRequestException("Metadatos del pago inválidos")

        if str(current_user.id) != usuario_id:
            raise BadRequestException("Este pago no corresponde a tu usuario")

        monto = Decimal(str(payment["transaction_amount"]))
        result = await SuscripcionService(self.db).renovar_suscripcion(
            current_user,
            suscripcion_id,
            monto,
            mp_payment_id=str(payment_id),
        )

        return {"status": "approved", **result.model_dump()}
