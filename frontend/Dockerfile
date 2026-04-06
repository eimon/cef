# =========================
# Base (misma imagen en todos los stages)
# =========================
FROM node:24-alpine AS base
WORKDIR /app

# =========================
# Deps: instala dependencias UNA sola vez
# =========================
FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

# =========================
# Dev: hot reload (sin build)
# =========================
FROM base AS dev

ENV NODE_ENV=development
ENV APP_ENV=development

# Reutiliza node_modules del stage deps
COPY --from=deps /app/node_modules ./node_modules

# El código se monta por volumen (NO se copia acá)
EXPOSE 3000

CMD ["npm", "run", "dev"]

# =========================
# Builder: build de producción con standalone
# =========================
FROM base AS builder

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_API_URL se baja al bundle en build-time (público)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# APP_ENV activa output:standalone en next.config.ts cuando vale "production"
ARG APP_ENV=production
ENV APP_ENV=$APP_ENV

RUN npm run build

# =========================
# Runner: imagen mínima con standalone output
# =========================
FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV APP_ENV=production

# Usuario no-root
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# El standalone output incluye su propio node_modules recortado,
# solo con las dependencias necesarias en runtime.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Los assets estáticos NO están incluidos en el standalone por defecto
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Archivos públicos (favicon, imágenes, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# standalone genera server.js en la raíz del output
CMD ["node", "server.js"]
