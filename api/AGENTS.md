# AGENTS.md — API

Este archivo es la referencia para agentes de código trabajando dentro de `api/`. Complementa el `CLAUDE.md` raíz.

## Dominios actuales

Solo existen dos routers registrados en `main.py`:

| Router | Prefijo | Descripción |
|--------|---------|-------------|
| `routers/auth.py` | `/auth` | Registro, login, refresh, logout, perfil |
| `routers/users.py` | `/users` | CRUD de usuarios (admin) |

## Estructura de Capas

Cada dominio sigue exactamente estas 5 capas:

```
models/{domain}.py                  → SQLAlchemy ORM model
schemas/{domain}.py                 → Pydantic (Base, Create, Update, Response)
repositories/{domain}_repository.py → Data access async, retorna None si no encuentra
services/{domain}_service.py        → Business logic, lanza excepciones de dominio
routers/{domain}.py                 → Endpoints HTTP, instancia Service(db) por endpoint
```

**Flujo obligatorio: Router → Service → Repository → DB. Los routers nunca acceden a la DB directamente.**

## Patrones de Código

### Model (SQLAlchemy)

```python
import uuid
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from core.database import Base

class NuevoModelo(Base):
    __tablename__ = "nuevo_modelos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    # campos...
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)
```

- PKs: siempre `UUID(as_uuid=True)` con `default=uuid.uuid4`
- Timestamps: `server_default=func.now()` para `created_at`, `onupdate=func.now()` para `updated_at`
- Soft delete: `is_active = Column(Boolean, default=True)`
- Monetarios: `Numeric(10, 2)`

### Schema (Pydantic)

```python
from pydantic import BaseModel, UUID4, Field
from typing import Optional
from datetime import datetime

class DomainBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)

class DomainCreate(DomainBase):
    pass

class DomainUpdate(BaseModel):  # NO hereda de Base
    name: Optional[str] = Field(None, min_length=1, max_length=200)

class DomainResponse(DomainBase):
    id: UUID4
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_active: bool

    class Config:
        from_attributes = True
```

- `Create` hereda de `Base`
- `Update` hereda de `BaseModel` directamente (todos los campos `Optional`)
- `Response` siempre con `Config.from_attributes = True`

### Repository

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid

class DomainRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: DomainCreate, **extra_fields) -> Domain:
        obj = Domain(**data.model_dump(), **extra_fields)
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def get_by_id(self, id: uuid.UUID) -> Domain | None:
        result = await self.db.execute(select(Domain).where(Domain.id == id))
        return result.scalars().first()

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[Domain]:
        result = await self.db.execute(
            select(Domain).where(Domain.is_active == True).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def update(self, id: uuid.UUID, data: DomainUpdate) -> Domain | None:
        obj = await self.get_by_id(id)
        if not obj:
            return None
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(obj, key, value)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, id: uuid.UUID) -> Domain | None:
        obj = await self.get_by_id(id)
        if not obj:
            return None
        obj.is_active = False  # soft delete
        return obj
```

- `flush()` + `refresh()` después de crear/actualizar — **nunca `commit()`**, lo maneja `get_db()`
- Delete es soft delete (`is_active = False`)
- Retorna `None` si no encuentra, **nunca lanza excepciones**

### Service

```python
from exceptions.general import NotFoundException
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

class DomainService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DomainRepository(db)

    async def get(self, id: uuid.UUID) -> Domain:
        obj = await self.repo.get_by_id(id)
        if not obj:
            raise NotFoundException("Recurso no encontrado")
        return obj
```

Excepciones disponibles en `exceptions/general.py`:

| Clase | HTTP |
|-------|------|
| `NotFoundException` | 404 |
| `ForbiddenException` | 403 |
| `UnauthorizedException` | 401 |
| `BadRequestException` | 400 |
| `ConflictException` | 409 |

Las validaciones de negocio van en el Service. El Repository solo accede a datos.

### Router

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List

from core.database import get_db
from dependencies.auth import get_current_user, has_role
from models.user import User as Usuario
from core.roles import Role

router = APIRouter(prefix="/domain", tags=["domain"])

@router.post("/", response_model=DomainResponse, status_code=201)
async def create(
    data: DomainCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_ADMIN)),
):
    return await DomainService(db).create(data)

@router.get("/", response_model=List[DomainResponse])
async def list_all(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return await DomainService(db).list(skip, limit)
```

- Instanciar `Service(db)` dentro de cada endpoint (no como dependencia global)
- Auth: `get_current_user` (autenticado), `has_role(Role.XXX)` (con permiso específico)
- Status codes: 201 para POST, 204 para DELETE
- Registrar el router en `main.py`: `app.include_router(nuevo_router.router)`

## Roles y Permisos (`core/roles.py`)

```python
class Role(str, Enum):
    ROLE_ADMIN = "ROLE_ADMIN"
    ROLE_RECEPCION = "ROLE_RECEPCION"
    ROLE_CLIENT = "ROLE_CLIENT"
```

Jerarquía: `ADMIN` incluye todos los permisos; `RECEPCION` incluye `ROLE_RECEPCION` y `ROLE_CLIENT`; `CLIENT` solo `ROLE_CLIENT`.

Al agregar nuevos roles para nuevos dominios, añadirlos al enum `Role` y a `role_hierarchy` en `core/roles.py`.

## Enums de Dominio (`core/enums.py`)

Actualmente definido y en uso: `UserRole` (`ADMIN`, `RECEPCION`, `CLIENT`).

## Seguridad (`core/security.py`)

- Hashing: Argon2 via `passlib`
- JWT: `python-jose` con HS256
- Token payload: `{"sub": "<user_uuid>", "role": "<role>", "exp": <timestamp>}`
- Funciones: `get_password_hash()`, `verify_password()`, `create_access_token()`, `hash_refresh_token()`
- Refresh tokens: almacenados como hash SHA-256 en tabla `refresh_tokens`. Rotación con detección de replay attack.

## Base de Datos

- **Engine:** asyncpg + SQLAlchemy async
- **Sesión:** `get_db()` auto-commit en éxito, auto-rollback en excepción
- **Nunca usar `session.commit()`** en repos/services
- **Usar `flush()` + `refresh()`** para obtener valores generados por la DB
- **Migraciones:** Alembic (async). Archivos en `alembic/`
  ```bash
  alembic revision --autogenerate -m "descripcion"
  alembic upgrade head
  ```
- `entrypoint.sh` ejecuta `alembic upgrade head` antes de iniciar uvicorn

## Tests

- **Framework:** pytest + pytest-asyncio (`asyncio_mode = auto`)
- **DB real:** PostgreSQL `cef_test_db`
- **Ejecución:**
  ```bash
  docker exec cef_api pytest tests/ -v
  docker exec cef_api pytest tests/test_auth.py -v         # solo auth
  docker exec cef_api pytest tests/test_auth.py::test_login # test individual
  ```
- **Estructura:** `tests/conftest.py` (fixtures: `client`, usuarios con roles, tokens), un archivo por dominio
- **Limpieza:** fixture `autouse` borra todas las tablas tras cada test

## Idioma

- Mensajes de error: **español**
- Nombres de código (clases, funciones, variables, archivos): **inglés**
- Endpoint paths: **inglés** (excepto `/auth/perfil`)

## Reglas de Dominio — IMPORTANTE

### Cupo disponible en clases sin instancia creada

Al calcular `cupo_disponible` para una fecha donde no existe todavía una `ClaseInstancia`, **NO** retornar `capacidad_maxima` directamente. El cupo correcto es:

```
cupo_disponible = capacidad_maxima − cantidad_de_suscripciones_activas_para_ese_template
```

Las suscripciones activas pre-reservan slots independientemente de si la instancia existe. El conteo **no filtra por fecha** — todas las suscripciones activas del template (estado != VENCIDA, activo=True) cuentan.

Implementado en: `services/clase_template_service.py` → `get_semana()` → función interna `cupo_disponible_for()`.

### Cancelación de clases

- **Por el usuario** → `DELETE` de la fila `Asistencia`. Nunca `cancelo=True`.
- **Por el sistema** (deuda vencida, suscripción expirada) → `cancelo=True` en `Asistencia`.
- Al cancelar clase de suscripción: solo se libera la `SuscripcionReserva` de esa instancia específica, sin tocar las reservas futuras.
- Siempre incrementar `ClaseInstancia.cupo += 1` al cancelar.

### Cupones de descuento en renovación de suscripciones

- La lógica de cupones (calcular descuento + marcar usados) vive en `SuscripcionService.renovar_suscripcion`, no en el router ni en PagoService.
- Si la suscripción vence por falta de pago, los cupones no usados se eliminan en `SuscripcionService.sync_suscripcion_state` al transicionar a VENCIDA.
- Máximo 2 cupones por ciclo (por `suscripcion_id`). Descuento proporcional: 25% para ciclos de 4 clases, 20% para ciclos de 5.

### Ciclo de suscripción y renovación automática

**Período de facturación:**
- El primer ciclo comienza el día de la primera clase (ej. miércoles 13 de mayo).
- Los ciclos siguientes comienzan el mismo día del mes (ej. 13 de junio, 13 de julio…).
- `fecha_fin = mismo_día_mes_siguiente - 1 día` (ej. 12 de junio).
- Para días 29, 30 o 31: se usan 30 días corridos (`fecha_fin = fecha_inicio + 29 días`) para evitar problemas de fin de mes.
- Implementado en `_calcular_fecha_fin()` en `services/suscripcion_service.py`.

**Clases dentro del período:**
- `fecha_inicio` del período puede NO ser el día de la clase (ej. 13 de junio es sábado, la clase es miércoles).
- La primera clase del ciclo es el primer día de semana correcto a partir de `fecha_inicio`.
- Usar siempre `_primera_clase_en_periodo(dia_semana, fecha_inicio)` para obtener la primera fecha de clase, y pasarla como inicio a `_calcular_fechas_clases`.
- **Nunca** pasar `fecha_inicio` del período directamente a `_calcular_fechas_clases` en contextos de renovación.

**Quién crea la siguiente suscripción:**
- Solo el cron (`POST /suscripciones/cron/procesar`, rol ADMIN) crea suscripciones del siguiente ciclo.
- `sync_suscripcion_state` **solo avanza estados** (VIGENTE → RENOVABLE → VENCIDA). No crea nada.
- `list_renovaciones_pendientes` **solo lee**. No llama a sync ni crea suscripciones.
- No existe endpoint manual de renovación en el frontend de cliente ni de admin; el cron lo hace por todas las suscripciones activas con `fecha_fin < hoy`.
