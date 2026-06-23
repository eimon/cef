# AGENTS.md — Frontend

Este archivo es la referencia para agentes de código trabajando dentro de `frontend/`. Complementa el `CLAUDE.md` raíz.

## Stack

- **Framework:** Next.js (App Router)
- **Lenguaje:** TypeScript (Strict Mode)
- **Estilos:** Tailwind CSS v4
- **Autenticación:** JWT con `jose` (validado en Middleware)
- **Validación:** Zod
- **HTTP (server-side):** fetch nativo vía `serverApi` (`src/lib/server-api.ts`)
- **HTTP (client-side):** axios (`src/lib/api.ts`)
- **Iconos:** `lucide-react`

## Estructura de Directorios

```
frontend/src/
├── app/
│   ├── (auth)/auth/login/page.tsx     # Página pública de login
│   ├── (dashboard)/                   # Rutas protegidas
│   │   ├── layout.tsx                 # Layout con Sidebar + Navbar
│   │   ├── page.tsx                   # Dashboard principal
│   │   ├── profile/page.tsx           # Perfil del usuario + cambio de contraseña
│   │   └── users/page.tsx             # Gestión de usuarios
│   └── api/auth/refresh/              # Route Handler para refresh desde cliente
├── actions/                           # Server Actions (lógica CRUD)
│   ├── auth.ts                        # login(), logout()
│   ├── profile.ts                     # changePassword()
│   └── users.ts                       # getUsers(), createUser(), updateUser(), deleteUser()
├── components/                        # Client Components reutilizables
│   ├── AddUserDialog.tsx
│   ├── ChangePasswordForm.tsx
│   ├── EditUserDialog.tsx
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   └── UsersTable.tsx
├── context/                           # ToastContext, ConfirmContext, SidebarContext
├── lib/
│   ├── api.ts                         # axios (browser, token desde document.cookie)
│   ├── server-api.ts                  # fetch helper (server, token desde cookie)
│   └── utils.ts                       # cn(), formatPrice()
├── middleware.ts                      # JWT guard — redirige a /auth/login si token inválido
└── types/
    └── api.ts                         # Interfaces y Enums del dominio
```

## Convenciones de Código

### Server Actions (`src/actions/`)

Siempre `"use server"` al inicio. Validan con Zod, llaman a `serverApi`, revalidan caché.

```typescript
"use server";

import { z } from "zod";
import { serverApi } from "@/lib/server-api";
import { revalidatePath } from "next/cache";

const domainSchema = z.object({
    name: z.string().min(1, "Name is required"),
});

export type DomainFormState = {
    error?: string;
    success?: boolean;
};

// Para useActionState — firma: (prevState, formData)
export async function createDomain(
    prevState: DomainFormState,
    formData: FormData
): Promise<DomainFormState> {
    const validatedFields = domainSchema.safeParse({ name: formData.get("name") });
    if (!validatedFields.success) {
        return { error: validatedFields.error.issues[0].message };
    }

    const res = await serverApi("/domain-endpoint", {
        method: "POST",
        body: JSON.stringify(validatedFields.data),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { error: errorData.detail || "Failed to create" };
    }

    revalidatePath("/domain-path");
    return { success: true };
}

// Actions de solo lectura (sin prevState)
export async function getDomains(): Promise<Domain[]> {
    try {
        const res = await serverApi("/domain-endpoint");
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}
```

**Reglas:**
- Usar `serverApi` (nunca axios) — lee el token desde la cookie `access_token`
- Tras mutaciones: llamar `revalidatePath()` con las rutas afectadas
- Devolver `{ error: string }` o `{ success: true }`, nunca lanzar al cliente

### Helpers de API

**`serverApi` (server-side):** Server Components y Actions. Maneja refresh automático de token con deduplicación de requests concurrentes.

```typescript
// GET con params
const res = await serverApi("/users/", { params: { skip: "0", limit: "100" } });

// POST / PUT / DELETE
const res = await serverApi("/users/", { method: "POST", body: JSON.stringify(data) });
const res = await serverApi(`/users/${id}`, { method: "DELETE" });
```

**`api` axios (client-side):** Solo Client Components. Lee `access_token` de `document.cookie`. Tiene interceptor que llama a `/api/auth/refresh` (Route Handler) ante 401 y reintenta la request.

### Tipos (`src/types/api.ts`)

Todos los tipos del dominio viven en un único archivo. No crear archivos de tipos por dominio.

- IDs como `string` (UUID)
- Fechas como `string` (`YYYY-MM-DD` o ISO datetime)
- Valores monetarios como `number`
- Enums TypeScript que replican los enums del backend

### Componentes (`src/components/`)

Client Components. Usar `useActionState` para forms conectados a Server Actions.

```typescript
"use client";

import { useActionState } from "react";
import { createDomain, type DomainFormState } from "@/actions/domain";

const initialState: DomainFormState = {};

export function DomainForm() {
    const [state, formAction, isPending] = useActionState(createDomain, initialState);

    return (
        <form action={formAction}>
            {state.error && <p className="text-cef-danger text-sm">{state.error}</p>}
            <button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar"}
            </button>
        </form>
    );
}
```

- `isPending` para deshabilitar botones y mostrar loading
- Diálogos modales: patrón con `isOpen` / `onClose` props
- Clases condicionales: `cn()` de `src/lib/utils.ts` (`clsx` + `tailwind-merge`)

### Páginas (Server Components)

Las páginas en `app/(dashboard)/` son Server Components. Obtienen datos con `serverApi` o actions de solo lectura.

```typescript
import { getUsers } from "@/actions/users";

export default async function UsersPage() {
    const users = await getUsers();
    return <UsersTable users={users} />;
}
```

Estado persistente de UI (tabs, filtros): URL Search Params.

### Middleware (`src/middleware.ts`)

Valida el JWT (cookie `access_token`) con `jose`. Redirige a `/auth/login` si el token falta o es inválido. Rutas públicas: `/auth/**` y assets estáticos.

Variable de entorno requerida: `JWT_SECRET_KEY`.

## Autenticación

- **Login:** `login()` en `actions/auth.ts` — obtiene token del backend, guarda en cookies
  - `access_token`: no-httpOnly (accesible desde `document.cookie` para axios), 30 min
  - `refresh_token`: httpOnly, 60 días
- **Logout:** `logout()` — revoca el refresh token en el backend, borra cookies, redirige a login
- **Refresh (server-side):** `serverApi` hace refresh automático ante 401 usando `refresh_token` httpOnly
- **Refresh (client-side):** axios interceptor llama a `/api/auth/refresh` Route Handler ante 401

## Design System — "Obsidian Glass"

Especificación completa en `DESIGN_SYSTEM.md`. Implementado en `src/app/globals.css`.

Clases disponibles: `.glass`, `.glass-elevated`, `.glass-modal`, `.glass-sidebar`.  
Tokens: `cef-primary`, `cef-base`, `cef-surface`, `cef-success`, `cef-warning`, `cef-danger`.  
Modales y diálogos: siempre `glass-modal rounded-2xl shadow-2xl`.

## Sistema Global de UI

- **Toast notifications**: `useToast()` → `showSuccess(msg)` / `showError(msg)` (registrado en layout raíz)
- **Diálogos de confirmación**: `useConfirm()` → `await confirm(mensaje)` devuelve `boolean` (registrado en layout raíz)

Disponibles en cualquier Client Component.

## Enums del Dominio (`src/types/api.ts`)

| Enum | Valores |
|---|---|
| `UserRole` | `ADMIN`, `RECEPCION`, `CLIENT` |

## Features Implementadas

### Dashboard (Home)

Muestra bienvenida con nombre del usuario y rol. Links a las secciones disponibles.

### Gestión de Usuarios (`/users`)

- `UsersTable`: listado con acciones (editar, eliminar)
- `AddUserDialog`: crear usuario (username, email, full_name, role, password)
- `EditUserDialog`: editar full_name, role y contraseña (opcional)
- Solo visible/accesible para roles con permisos de gestión

### Perfil (`/profile`)

- Muestra datos del usuario autenticado
- `ChangePasswordForm`: cambio de contraseña (contraseña actual + nueva + confirmación)

## Idioma

- Strings de UI hardcodeados en el código (sin sistema de i18n)
- Nombres de código (clases, funciones, variables, archivos): **inglés**
- Mensajes de error del backend en **español** (se muestran tal cual)

## Variables de Entorno

```env
# frontend/.env.local
JWT_SECRET_KEY=      # mismo valor que SECRET_KEY del backend
NEXT_PUBLIC_API_URL= # ej: http://localhost:8000
```

## Reglas de Dominio — IMPORTANTE

### Cupo disponible en la vista de clases

El campo `cupo_disponible` que devuelve el backend en `ClaseSemanaResponse` ya viene calculado correctamente:
- Si existe instancia para esa fecha: refleja `instancia.cupo` (slots reales restantes)
- Si **no** existe instancia: refleja `capacidad_maxima − suscripciones_activas` del template

**No recalcular el cupo en el frontend.** Mostrar siempre el valor que devuelve la API. Una clase sin instancia todavía puede estar llena si todas las suscripciones activas copan la capacidad.

### Cancelación de clases

- Solo clases próximas con `asistencia_id` pueden cancelarse (el usuario está inscripto)
- El backend retorna `CancelacionResult` con `reintegro: "none" | "mp" | "cupon"` y `mensaje` listo para mostrar
- Implementado en `MisClasesView.tsx` → `CancelDialog`
