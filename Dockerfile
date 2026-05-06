# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Multi-stage Next.js (standalone) build. Produces a ~150MB final image that
# runs anywhere container platforms run: DO App Platform, Fly, Railway, Render,
# Coolify on a VPS, plain Docker, Kubernetes, etc.
#
# Build:   docker build -t tes-treats:latest .
# Run:     docker run --rm -p 3000:3000 --env-file .env.local tes-treats:latest
# Compose: docker compose -f docker-compose.prod.yml up
# -----------------------------------------------------------------------------

# ----- 1. Dependencies (cached layer) ----------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ----- 2. Build --------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next telemetry off in builds
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ----- 3. Runtime ------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy the standalone build (.next/standalone has its own minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Migrations: scripts/migrate.mjs uses drizzle-orm's runtime migrator (no
# drizzle-kit, no esbuild) so it works in the standalone runtime image.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres

USER nextjs
EXPOSE 3000

# Apply migrations then start the standalone server. If you'd rather run
# migrations as a separate one-off task, override the CMD on deploy.
CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
