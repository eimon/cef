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
                valor="0",
                updated_at=datetime.now(timezone.utc),
            )
        return ConfiguracionResponse.model_validate(config)

    async def update_sena_minima(self, data: SenaMinimaUpdate) -> ConfiguracionResponse:
        valor_limpio = data.valor.strip().replace("$", "").replace(".", "").replace(",", ".")
        try:
            monto = float(valor_limpio)
        except ValueError:
            raise BadRequestException(
                "El precio debe ser un valor mayor a cero"
            )
        if monto <= 0:
            raise BadRequestException(
                "El precio debe ser un valor mayor a cero"
            )

        config = await self.repo.upsert(CLAVE_SENA_MINIMA, str(monto))
        return ConfiguracionResponse.model_validate(config)
