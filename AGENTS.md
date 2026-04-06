# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

CEF — sistema de gestión base con autenticación JWT. Stack: FastAPI + PostgreSQL (backend) y Next.js App Router (frontend), orquestados con Docker Compose.

## Estructura y subagentes

| Directorio | Responsabilidad | Referencia |
|---|---|---|
| `api/` | FastAPI — auth, usuarios, lógica de dominio | `api/CLAUDE.md` |
| `frontend/` | Next.js — UI, Server Actions, componentes | `frontend/CLAUDE.md` |

Toda convención de código, patrón de capas, diseño visual y detalle de implementación está documentado en el `CLAUDE.md` del subdirectorio correspondiente. **No modificar código sin leer primero el CLAUDE.md del subagente.**

## Comandos globales

```bash
# Levantar todo el stack
docker compose up --build

# Variables de entorno
# 1. Copiar .env.example → .env y completar SECRET_KEY y POSTGRES_PASSWORD
# 2. Crear frontend/.env.local con JWT_SECRET_KEY (igual a SECRET_KEY) y NEXT_PUBLIC_API_URL
```

## Convenciones globales

- Mensajes de error y strings de UI: **español**
- Nombres de código (clases, funciones, variables, archivos): **inglés**
- Sin sistema de internacionalización (i18n) — strings hardcodeados
