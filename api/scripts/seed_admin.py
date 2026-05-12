import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select
from core.database import AsyncSessionLocal
from core.enums import UserRole
from core.security import get_password_hash
from models.usuario import Usuario


async def seed_admin() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Usuario).where(Usuario.email == "admin@cef.ar"))
        if result.scalars().first():
            print("Admin ya existe, omitiendo.")
            return

        session.add(Usuario(
            email="admin@cef.ar",
            telefono="1100000001",
            hashed_password=get_password_hash("admin"),
            nombre="Administrador",
            role=UserRole.ADMIN,
        ))
        await session.commit()
        print("Admin creado.")


if __name__ == "__main__":
    asyncio.run(seed_admin())
