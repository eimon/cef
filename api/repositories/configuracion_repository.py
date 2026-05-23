from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.configuracion import Configuracion


class ConfiguracionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_clave(self, clave: str) -> Configuracion | None:
        result = await self.db.execute(
            select(Configuracion).where(Configuracion.clave == clave)
        )
        return result.scalars().first()

    async def upsert(self, clave: str, valor: str) -> Configuracion:
        config = await self.get_by_clave(clave)
        if config:
            config.valor = valor
        else:
            config = Configuracion(clave=clave, valor=valor)
            self.db.add(config)
        await self.db.commit()
        await self.db.refresh(config)
        return config
