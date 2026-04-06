# CEF

Sistema de gestión para un centro de actividad física.

Desarrollado con FastAPI (backend) y Next.js (frontend), con autenticación JWT y base de datos PostgreSQL.

## Requisitos

- Docker y Docker Compose

## Inicio rápido

```bash
cp .env.example .env        # completar SECRET_KEY y POSTGRES_PASSWORD
docker compose up --build
```

La API queda disponible en `http://localhost:8000` y el frontend en `http://localhost:3000`.
