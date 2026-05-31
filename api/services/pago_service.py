from datetime import date
from decimal import Decimal
from uuid import UUID

import mercadopago
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.config import settings
from exceptions.general import BadRequestException, ConflictException, NotFoundException
from models.pagos import Pago
from models.usuario import Usuario
from repositories.inscripcion_repository import InscripcionRepository
from repositories.precio_disciplina_repository import PrecioDisciplinaRepository
from schemas.inscripcion import InscripcionIndividualCreate
from services.inscripcion_service import InscripcionService


class PagoService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._sdk: mercadopago.SDK | None = None

    @property
    def sdk(self) -> mercadopago.SDK:
        if not settings.MP_ACCESS_TOKEN:
            raise BadRequestException("Los pagos con MercadoPago no están configurados")
        if not self._sdk:
            self._sdk = mercadopago.SDK(settings.MP_ACCESS_TOKEN)
        return self._sdk

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

        precio_disciplina = await PrecioDisciplinaRepository(self.db).get_by_disciplina(template.disciplina)
        if not precio_disciplina:
            raise BadRequestException("No hay precio configurado para esta disciplina")

        precio = float(precio_disciplina.precio_individual)
        monto_minimo = precio / 2

        if monto < monto_minimo:
            raise BadRequestException(f"El monto mínimo es ${monto_minimo:.2f}")
        if monto > precio:
            raise BadRequestException(f"El monto no puede superar ${precio:.2f}")

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

        if status != "approved":
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
