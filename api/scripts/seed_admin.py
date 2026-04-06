import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.future import select
from core.database import AsyncSessionLocal
from core.enums import UserRole
from core.security import get_password_hash
from models.user import User


async def seed_admin() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.username == "admin"))
        existing = result.scalars().first()

        if existing:
            print("Admin user already exists, skipping.")
            return

        admin = User(
            username="admin",
            email="admin@cef.ar",
            phone="123456789",
            hashed_password=get_password_hash("admin"),
            full_name="Administrador",
            role=UserRole.ADMIN,
        )
        session.add(admin)
        await session.commit()
        print("Admin user created successfully.")


if __name__ == "__main__":
    asyncio.run(seed_admin())
