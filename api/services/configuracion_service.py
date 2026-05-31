from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from repositories.configuracion_repository import ConfiguracionRepository
from schemas.configuracion import ConfiguracionResponse, SenaMinimaUpdate
from exceptions.general import BadRequestException

CLAVE_SENA_MINIMA = "sena_minima"


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
