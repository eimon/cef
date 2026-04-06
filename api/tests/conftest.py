import pytest
import uuid

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from main import app
from core.database import Base, get_db
from core.config import settings
from core.security import get_password_hash, create_access_token
from core.enums import UserRole

from models.user import User
from models.refresh_token import RefreshToken  # noqa: F401

# ---------- Test database ----------

TEST_DATABASE_URL = settings.DATABASE_URL.replace("/cef_db", "/cef_test_db")

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestAsyncSession = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestAsyncSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ---------- DB lifecycle ----------

@pytest.fixture(scope="session", autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest.fixture(autouse=True)
async def clean_tables():
    """Delete all rows after each test (children first to respect FKs)."""
    yield
    async with test_engine.begin() as conn:
        await conn.execute(text("DELETE FROM bookings"))
        await conn.execute(text("DELETE FROM pricing_rules"))
        await conn.execute(text("DELETE FROM property_costs"))
        await conn.execute(text("DELETE FROM property_base_prices"))
        await conn.execute(text("DELETE FROM properties"))
        await conn.execute(text("DELETE FROM guests"))
        await conn.execute(text("DELETE FROM refresh_tokens"))
        await conn.execute(text("DELETE FROM users"))


# ---------- Helpers ----------

async def _create_user(role: UserRole, username: str, email: str) -> User:
    async with TestAsyncSession() as session:
        user = User(
            id=uuid.uuid4(),
            username=username,
            email=email,
            hashed_password=get_password_hash("testpass123"),
            full_name=f"Test {role.value.title()}",
            role=role,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


def _make_token(user: User) -> str:
    return create_access_token(
        subject=str(user.id),
        claims={"role": user.role.value},
    )


# ---------- Client ----------

@pytest.fixture
async def client():
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


# ---------- User fixtures ----------

@pytest.fixture
async def admin_user():
    return await _create_user(UserRole.ADMIN, "admin_test", "admin@test.com")


@pytest.fixture
async def admin_headers(admin_user):
    return {"Authorization": f"Bearer {_make_token(admin_user)}"}


@pytest.fixture
async def manager_user():
    return await _create_user(UserRole.MANAGER, "manager_test", "manager@test.com")


@pytest.fixture
async def manager_headers(manager_user):
    return {"Authorization": f"Bearer {_make_token(manager_user)}"}


@pytest.fixture
async def owner_user():
    return await _create_user(UserRole.OWNER, "owner_test", "owner@test.com")


@pytest.fixture
async def owner_headers(owner_user):
    return {"Authorization": f"Bearer {_make_token(owner_user)}"}


# ---------- Domain fixtures ----------

@pytest.fixture
async def test_property(client, admin_headers):
    resp = await client.post(
        "/properties/",
        json={
            "name": "Test Property",
            "address": "123 Test St",
            "base_price": "100.00",
            "avg_stay_days": 3,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    return resp.json()
