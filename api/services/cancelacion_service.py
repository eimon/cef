import uuid
import mercadopago
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.enums import TipoInscripcion, EstadoPago
from exceptions.general import NotFoundException, BadRequestException
from models.usuario import Usuario
from repositories.asistencia_repository import AsistenciaRepository
from repositories.cupon_descuento_repository import CuponDescuentoRepository
from repositories.pago_repository import PagoRepository
from repositories.suscripcion_repository import SuscripcionRepository
from schemas.cancelacion import CancelacionResponse

ART = timezone(timedelta(hours=-3))


class CancelacionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.asistencia_repo = AsistenciaRepository(db)
        self.cupon_repo = CuponDescuentoRepository(db)
        self.pago_repo = PagoRepository(db)
        self.suscripcion_repo = SuscripcionRepository(db)
        self._sdk: mercadopago.SDK | None = None

    @property
    def sdk(self) -> mercadopago.SDK:
        if not settings.MP_ACCESS_TOKEN:
            raise BadRequestException("Los pagos con MercadoPago no están configurados")
        if not self._sdk:
            self._sdk = mercadopago.SDK(settings.MP_ACCESS_TOKEN)
        return self._sdk

    async def cancelar(self, usuario: Usuario, asistencia_id: uuid.UUID) -> CancelacionResponse:
        asistencia = await self.asistencia_repo.get_by_id_with_relations(asistencia_id)
        if not asistencia or asistencia.usuario_id != usuario.id:
            raise NotFoundException("Inscripción no encontrada")

        instancia = asistencia.clase_instancia
        template = instancia.clase_template

        clase_dt = datetime.combine(instancia.fecha, template.hora_inicio).replace(tzinfo=ART)
        now = datetime.now(timezone.utc)

        if clase_dt <= now:
            raise BadRequestException("No podés cancelar una clase que ya comenzó")

        horas_restantes = (clase_dt - now).total_seconds() / 3600
        tipo = asistencia.tipo

        instancia.cupo += 1

        suscripcion_id: uuid.UUID | None = None
        if tipo == TipoInscripcion.SUSCRIPCION:
            reserva = await self.suscripcion_repo.get_reserva_by_instancia_and_usuario(
                instancia.id, usuario.id
            )
            if reserva:
                reserva.activa = False
                suscripcion_id = reserva.suscripcion_id

        await self.db.delete(asistencia)
        await self.db.flush()

        if horas_restantes < 24:
            return CancelacionResponse(
                reintegro="none",
                mensaje="Clase cancelada. Como faltan menos de 24 horas no se realizará reintegro.",
            )

        if tipo == TipoInscripcion.INDIVIDUAL:
            return await self._reintegro_mp(usuario.id, instancia.id)

        if tipo == TipoInscripcion.SUSCRIPCION and suscripcion_id:
            return await self._emitir_cupon(suscripcion_id)

        return CancelacionResponse(reintegro="none", mensaje="Clase cancelada.")

    async def _reintegro_mp(
        self, usuario_id: uuid.UUID, instancia_id: uuid.UUID
    ) -> CancelacionResponse:
        pagos = await self.pago_repo.get_paid_by_usuario_and_instancia(usuario_id, instancia_id)
        monto_reintegrado = Decimal(0)
        refund_error = False

        for pago in pagos:
            if pago.mp_payment_id and pago.mp_payment_id != "mock":
                try:
                    result = self.sdk.payment().refund(pago.mp_payment_id)
                    if result.get("status") in (200, 201):
                        pago.estado = EstadoPago.ANULADO
                        monto_reintegrado += pago.monto
                    else:
                        refund_error = True
                except Exception:
                    refund_error = True
            else:
                monto_reintegrado += pago.monto

        await self.db.flush()

        if refund_error:
            mensaje = "Clase cancelada. Hubo un problema procesando el reintegro — comunicate con nosotros."
        else:
            mensaje = f"Clase cancelada. Se reintegró ${monto_reintegrado:,.0f} a tu cuenta de MercadoPago."

        return CancelacionResponse(
            reintegro="mp",
            mensaje=mensaje,
            monto_reintegrado=float(monto_reintegrado),
            refund_error=refund_error,
        )

    async def _emitir_cupon(self, suscripcion_id: uuid.UUID) -> CancelacionResponse:
        count = await self.cupon_repo.count_by_suscripcion(suscripcion_id)
        if count >= 2:
            return CancelacionResponse(
                reintegro="none",
                mensaje="Clase cancelada. Ya alcanzaste el límite de reintegros para este ciclo de suscripción.",
            )

        total_clases = await self.suscripcion_repo.count_reservas_by_suscripcion(suscripcion_id)
        descuento = Decimal(100) / max(total_clases, 1)
        await self.cupon_repo.create(suscripcion_id, descuento)

        return CancelacionResponse(
            reintegro="cupon",
            descuento_porcentaje=float(descuento),
            mensaje=f"Clase cancelada. Se generó un cupón de {descuento:.0f}% de descuento para tu próxima renovación.",
        )
