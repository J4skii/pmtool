# syntax=docker/dockerfile:1
# ---------- Base ----------
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /repo

# ---------- Prune / deps ----------
FROM base AS deps
COPY pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/config/ packages/config/
RUN pnpm install --frozen-lockfile=false

# ---------- Build ----------
FROM base AS builder
COPY --from=deps /repo /repo
COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT_STANDALONE=1
RUN pnpm --filter @flowos/web build

# ---------- Runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
