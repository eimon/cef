from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from repositories.configuracion_repository import ConfiguracionRepository
from schemas.configuracion import ConfiguracionResponse, SenaMinimaUpdate, DiasUpdate
from exceptions.general import BadRequestException

CLAVE_SENA_MINIMA = "sena_minima"
CLAVE_PLAZO_PAGO = "plazo_pago_dias"
CLAVE_DIAS_AVISO = "dias_aviso_vencimiento"


class ConfiguracionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ConfiguracionRepository(db)

    async def get_sena_minima(self) -> ConfiguracionResponse:
        config = await self.repo.get_by_clave(CLAVE_SENA_MINIMA)
        if not config:
            return ConfiguracionResponse(
                clave=CLAVE_SENA_MINIMA,
                valor="50",
                updated_at=datetime.now(timezone.utc),
            )
        return ConfiguracionResponse.model_validate(config)

    async def get_plazo_pago_dias(self) -> ConfiguracionResponse:
        config = await self.repo.get_by_clave(CLAVE_PLAZO_PAGO)
        if not config:
            return ConfiguracionResponse(
                clave=CLAVE_PLAZO_PAGO,
                valor="10",
                updated_at=datetime.now(timezone.utc),
            )
        return ConfiguracionResponse.model_validate(config)

    async def get_plazo_pago_dias_value(self) -> int:
        config = await self.repo.get_by_clave(CLAVE_PLAZO_PAGO)
        try:
            return int(config.valor) if config else 10
        except (ValueError, TypeError):
            return 10

    async def update_plazo_pago_dias(self, data: DiasUpdate) -> ConfiguracionResponse:
        try:
            dias = int(data.valor.strip())
        except (ValueError, AttributeError):
            raise BadRequestException("El valor debe ser un número entero de días")
        if dias < 1 or dias > 90:
            raise BadRequestException("El plazo debe ser entre 1 y 90 días")
        config = await self.repo.upsert(CLAVE_PLAZO_PAGO, str(dias))
        return ConfiguracionResponse.model_validate(config)

    async def get_dias_aviso_vencimiento(self) -> ConfiguracionResponse:
        config = await self.repo.get_by_clave(CLAVE_DIAS_AVISO)
        if not config:
            return ConfiguracionResponse(
                clave=CLAVE_DIAS_AVISO,
                valor="1",
                updated_at=datetime.now(timezone.utc),
            )
        return ConfiguracionResponse.model_validate(config)

    async def get_dias_aviso_value(self) -> int:
        config = await self.repo.get_by_clave(CLAVE_DIAS_AVISO)
        try:
            return int(config.valor) if config else 1
        except (ValueError, TypeError):
            return 1

    async def update_dias_aviso_vencimiento(self, data: DiasUpdate) -> ConfiguracionResponse:
        try:
            dias = int(data.valor.strip())
        except (ValueError, AttributeError):
            raise BadRequestException("El valor debe ser un número entero de días")
        if dias < 1 or dias > 30:
            raise BadRequestException("El aviso debe ser entre 1 y 30 días")
        config = await self.repo.upsert(CLAVE_DIAS_AVISO, str(dias))
        return ConfiguracionResponse.model_validate(config)

    async def update_sena_minima(self, data: SenaMinimaUpdate) -> ConfiguracionResponse:
        try:
            porcentaje = float(data.valor.strip())
        except ValueError:
            raise BadRequestException(
                "El porcentaje debe ser un valor entre 50 y 100"
            )
        if porcentaje < 50 or porcentaje > 100:
            raise BadRequestException(
                "El porcentaje debe ser un valor entre 50 y 100"
            )

        config = await self.repo.upsert(CLAVE_SENA_MINIMA, str(porcentaje))
        return ConfiguracionResponse.model_validate(config)
