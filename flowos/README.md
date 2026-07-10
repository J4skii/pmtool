# FlowOS

**Turnkey, white-label Project Management Operating System.**

FlowOS is a multi-tenant PM platform that any business can rebrand as its own: custom terminology ("Jobs" instead of "Projects"), custom themes, custom fields, industry workflow templates, client portals, time tracking, finance (invoices, expenses, POs), automations, and AI assistance — all scoped per tenant.

## Architecture

```
                        ┌──────────────────────────────┐
                        │  Browser / PWA                │
                        │  {slug}.flowos.app / custom   │
                        └──────────────┬───────────────┘
                                       │ HTTPS / WebSocket
              ┌────────────────────────┴────────────────────────┐
              │                                                  │
   ┌──────────▼──────────┐                          ┌───────────▼──────────┐
   │  apps/web           │   REST + WS              │  apps/api            │
   │  Next.js 14         ├─────────────────────────►│  NestJS              │
   │  (App Router, PWA)  │                          │  REST · WS · BullMQ  │
   └─────────────────────┘                          └───────────┬──────────┘
                                                                │
        ┌───────────────┬──────────────┬──────────────┬─────────┴───────┐
        │               │              │              │                 │
 ┌──────▼─────┐  ┌──────▼─────┐ ┌──────▼──────┐ ┌─────▼──────┐  ┌───────▼──────┐
 │ PostgreSQL │  │   Redis    │ │ MinIO / S3  │ │ Meilisearch│  │   Mailpit /  │
 │  (Prisma)  │  │ cache+jobs │ │ file store  │ │   search   │  │     SMTP     │
 └────────────┘  └────────────┘ └─────────────┘ └────────────┘  └──────────────┘

 Shared workspace packages:
   packages/database  → Prisma schema, client, seed
   packages/shared    → permissions, terminology, Zod schemas, error codes
   packages/config    → tsconfig base, eslint base, jest preset
```

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| API | NestJS (`apps/api`) — REST, WebSockets, BullMQ workers |
| Web | Next.js 14 App Router (`apps/web`), PWA |
| Database | PostgreSQL 15 via Prisma (`packages/database`) |
| Cache / queues | Redis 7 (sessions, cache, BullMQ) |
| File storage | MinIO locally, S3-compatible in production (presigned uploads) |
| Search | Meilisearch |
| Email (dev) | Mailpit (SMTP capture UI on port 8025) |
| Validation | Zod schemas shared via `packages/shared` |
| E2E tests | Playwright (`apps/web/e2e`) |
| CI/CD | GitHub Actions (`.github/workflows`) |

## Prerequisites

- **Node.js 20+**
- **pnpm** via corepack (version pinned in `package.json` → `pnpm@9.15.0`)
- **Docker Desktop** (for local infra services)

## Quick Start

```bash
# 1. Enable pnpm and install dependencies
corepack enable && pnpm install

# 2. Start infrastructure services (postgres, redis, minio, meilisearch, mailpit)
docker compose up -d

# 3. Configure environment
cp .env.example .env

# 4. Prepare the database
pnpm db:generate && pnpm db:migrate && pnpm db:seed

# 5. Run everything in dev mode
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000
- MinIO console: http://localhost:9001 (minioadmin / minioadmin)
- Mailpit UI: http://localhost:8025
- Meilisearch: http://localhost:7700

### Demo credentials (seeded)

All demo users share the password **`Demo1234!`**.

| Tenant | Slug | User | Role |
|---|---|---|---|
| Acme Construction Co | `acme-build` | `owner@acmebuild.demo` | Super Admin |
| Acme Construction Co | `acme-build` | `pm@acmebuild.demo` | Project Manager |
| Acme Construction Co | `acme-build` | `field@acmebuild.demo` | Contributor |
| Nova Digital Agency | `nova-digital` | `ceo@novadigital.demo` | Super Admin |
| Nova Digital Agency | `nova-digital` | `lead@novadigital.demo` | Team Lead |

The two tenants demonstrate white-labeling: `acme-build` uses construction terminology ("Job", "Work Item", "Owner") with an orange theme; `nova-digital` uses marketing defaults with a blue theme.

### Fully containerized run

The `api` and `web` services are behind the `full` compose profile:

```bash
docker compose --profile full up
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run all apps in dev mode (turbo) |
| `pnpm build` | Build all packages/apps |
| `pnpm lint` | Lint all workspaces |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run E2E tests |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run dev migrations (`prisma migrate dev`) |
| `pnpm db:push` | Push schema without a migration |
| `pnpm db:seed` | Seed demo tenants/users/projects |
| `pnpm format` | Prettier write |
| `pnpm clean` | Clean build output and node_modules |
| `scripts/dev-setup.ps1` / `scripts/dev-setup.sh` | One-shot local setup |

## Monorepo Layout

```
flowos/
├── apps/
│   ├── api/                 # NestJS API (REST, WebSockets, BullMQ)
│   │   └── test/            # API e2e (supertest) scaffolding
│   └── web/                 # Next.js 14 frontend (App Router, PWA)
│       ├── e2e/             # Playwright specs
│       └── playwright.config.ts
├── packages/
│   ├── database/            # Prisma schema, migrations, seed
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   ├── shared/              # Permissions, terminology, Zod schemas, errors
│   └── config/              # tsconfig base, eslint base, jest preset
├── docs/                    # Architecture, API, security, customization docs
├── scripts/                 # dev-setup.ps1 / dev-setup.sh
├── .github/workflows/       # ci.yml, deploy.yml, codeql.yml
├── docker-compose.yml       # Local infra (+ full profile for api/web)
├── turbo.json
└── pnpm-workspace.yaml
```

## Documentation

- [Architecture](docs/architecture.md) — multi-tenancy, RBAC, white-labeling, queues, real-time
- [API conventions](docs/api.md) — envelopes, auth flow, endpoint summary
- [Customization](docs/customization.md) — Skin JSON, terminology, custom fields, workflow templates
- [Security](docs/security.md) — threat model, tenant isolation, compliance
- [Mobile](docs/mobile.md) — PWA and future React Native plans

## Troubleshooting

### Windows notes

- Run commands from **PowerShell** or **Git Bash**; the setup script is `scripts/dev-setup.ps1`.
- If `corepack enable` fails with EPERM, run the terminal as Administrator once, or `npm i -g pnpm@9.15.0` as a fallback.
- Docker Desktop must be running (WSL 2 backend recommended) before `docker compose up -d`.
- If port 5432/6379 is taken by a native install, stop the native service or change the published port in `docker-compose.yml` **and** `DATABASE_URL`/`REDIS_URL` in `.env`.
- Line endings: the repo assumes LF (`.editorconfig` enforces this); configure git with `git config core.autocrlf input`.

### Common issues

| Symptom | Fix |
|---|---|
| `prisma migrate dev` cannot reach database | `docker compose ps` — wait for postgres to be healthy, check `DATABASE_URL` in `.env` |
| Seed fails on unique constraint | The seed is idempotent for demo tenants only; re-run `pnpm db:seed` |
| MinIO bucket missing | The `createbucket` compose service creates `flowos-files`; re-run `docker compose up -d` |
| Stale Prisma client types | `pnpm db:generate` after any schema change |
| Turbo cache weirdness | `pnpm clean` then reinstall |

### No Docker? (fallback)

Install services natively or use hosted equivalents, then point `.env` at them:

- **PostgreSQL 15**: native installer or a hosted DB (Neon, Supabase, RDS) → `DATABASE_URL`
- **Redis 7**: Memurai on Windows, or hosted (Upstash) → `REDIS_URL`
- **MinIO/S3**: any S3 bucket → `S3_*` vars
- **Meilisearch**: Meilisearch Cloud → `MEILISEARCH_HOST` / `MEILISEARCH_API_KEY`
- **SMTP**: any SMTP provider → `SMTP_*` vars (Mailpit is dev-only convenience)
