# ============================================================
# FlowOS API — multi-stage Docker build (pnpm / turborepo)
# Build context must be the monorepo root:
#   docker build -f apps/api/Dockerfile .
# ============================================================

# ---------- Stage 1: install workspace dependencies ----------
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /repo

# Copy manifests first for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
COPY packages/config/ packages/config/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ---------- Stage 2: generate prisma client + build ----------
FROM deps AS build
WORKDIR /repo

COPY packages/database/ packages/database/
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Generate the Prisma client against the schema
RUN pnpm --filter @flowos/database exec prisma generate --schema prisma/schema.prisma

# Compile the NestJS app
RUN pnpm --filter @flowos/api build

# Remove dev dependencies for a slim runtime node_modules
RUN pnpm prune --prod

# ---------- Stage 3: slim runtime ----------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Non-root user
RUN addgroup -S flowos && adduser -S flowos -G flowos

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json

USER flowos
EXPOSE 4000
CMD ["node", "apps/api/dist/apps/api/src/main.js"]
