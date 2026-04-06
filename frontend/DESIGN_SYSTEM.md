# Design System — Obsidian Glass

Sistema de diseño oscuro con glassmorphism. Implementado en `src/app/globals.css`.

## Tokens de Color (`globals.css` → `@theme`)

| Token Tailwind | Valor | Uso |
|---|---|---|
| `cef-primary` | `#818cf8` | Acciones principales, links activos, iconos de énfasis |
| `cef-base` | `#06090f` | Fondo base de la aplicación |
| `cef-surface` | `#0c1120` | Superficies secundarias (opciones de select, etc.) |
| `cef-success` | `#34d399` | Estados positivos, confirmaciones |
| `cef-warning` | `#fbbf24` | Advertencias |
| `cef-danger` | `#f87171` | Errores, acciones destructivas |

Usar siempre los tokens (`text-cef-primary`, `bg-cef-base`, etc.). No hardcodear los valores hex en los componentes.

## Clases Glass

Definidas en `globals.css`. No recrearlas con estilos inline.

### `.glass`
Superficie base translúcida. Para cards, paneles y contenedores generales.
```
bg: rgb(255 255 255 / 0.04)
border: 1px solid rgb(255 255 255 / 0.08)
backdrop-filter: blur(24px) saturate(160%)
```

### `.glass-elevated`
Superficie elevada, ligeramente más opaca. Para cards en hover o superficies secundarias destacadas.
```
bg: rgb(255 255 255 / 0.07)
border: 1px solid rgb(255 255 255 / 0.11)
backdrop-filter: blur(24px) saturate(160%)
```

### `.glass-modal`
Para diálogos, modales y overlays. Fondo oscuro intenso.
```
bg: rgb(6 9 15 / 0.88)
border: 1px solid rgb(255 255 255 / 0.09)
backdrop-filter: blur(40px) saturate(200%)
```

### `.glass-sidebar`
Para la barra de navegación lateral.
```
bg: rgb(8 12 22 / 0.94)
border-color: rgb(255 255 255 / 0.07)
backdrop-filter: blur(24px) saturate(160%)
```

## Fondo de Página

El body tiene un gradiente radial sutil definido en `globals.css` — no replicarlo en componentes individuales.

## Reglas de Uso

- **Modales y diálogos:** siempre `glass-modal rounded-2xl shadow-2xl`
- **Cards interactivas:** `glass rounded-2xl` con `hover:bg-white/[0.07] transition-all`
- **Texto primario:** `text-white/90`
- **Texto secundario / subtítulos:** `text-white/40` — `text-white/60`
- **Bordes sutiles:** `border border-white/[0.05]`

## Tipografía

- Fuente: Geist Sans (variable CSS `--font-geist-sans`)
- Color base: `rgb(255 255 255 / 0.90)`
- Color scheme: `dark`

## Formularios

Los inputs, textareas y selects tienen estilos globales en `globals.css`:
- Texto: `rgb(255 255 255 / 0.90)`
- Placeholder: `rgb(255 255 255 / 0.28)`
- Fondo de `<option>`: `#0c1120`

No agregar estos estilos a nivel de componente — ya están aplicados globalmente.

## Scrollbar

Personalizada globalmente: delgada (5px), thumb `rgb(255 255 255 / 0.10)`, sin track visible.
