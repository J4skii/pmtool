# FlowOS Architecture

## Multi-tenancy Model

FlowOS uses a **shared-database, shared-schema** multi-tenancy model:

- Every tenant-scoped table carries a `tenantId` column (UUID, indexed, FK to `Tenant` with cascade delete). See `packages/database/prisma/schema.prisma`.
- `Tenant` is the root aggregate. `Organization` (1:1 with Tenant) holds the company profile and the white-label `branding` JSON.
- `User` is a **global** identity; tenancy membership is modeled via `Membership (tenantId, userId, roleId)` with a unique `(tenantId, userId)` constraint. A user may hold different roles in different tenants.
- Soft deletes (`deletedAt`) everywhere except append-only tables (`AuditLog`, `Activity`, `TaskAssignee`, `TaskDependency`, `RefreshToken`, `FileVersion`).

### Tenant resolution order

The API resolves the acting tenant for each request in this order:

1. **JWT claim** — the access token carries `tenantId` (set at login for the chosen tenant). Authoritative for authenticated API calls.
2. **`X-Tenant-Id` / `X-Tenant-Slug` header** — used by multi-tenant admin tooling and by the web app during tenant switching, validated against the user's memberships.
3. **Subdomain** — `{slug}.flowos.app` (or a mapped `Tenant.customDomain`) resolves the tenant for unauthenticated surfaces (login page branding, client portal, public forms).

Every Prisma query on tenant-scoped models MUST include `tenantId` in the `where` clause. This is enforced by a request-scoped tenant context plus a Prisma client extension that injects/asserts the filter (defense in depth; see `docs/security.md`).

### Data residency

`Tenant.dataRegion` (`US | EU | AU | ZA`) records where a tenant's data must live. Initially informational (single region deployment); the target state is region-pinned database clusters and S3 buckets, with the API routing by tenant region. Cross-region features (e.g. platform analytics) must operate on aggregates only.

## RBAC Design

- **Permission catalog** lives in `packages/shared/src/permissions.ts`. Keys are hierarchical dot-paths: `<module>.<action>` (e.g. `tasks.create`) and nested finance keys (e.g. `finance.invoices.send`). The catalog is generated from `MODULE_ACTIONS` and rendered as the permissions matrix in Settings.
- **Modules**: `projects, tasks, files, comments, time, finance, team, reports, dashboards, automations, portal, settings, branding, audit, ai`.
- **Wildcards**: a role's `permissions: string[]` may contain exact keys, module wildcards (`tasks.*`, `finance.invoices.*`), or the global wildcard (`*`). Resolution logic is `hasPermission()` in shared — the API guard and the frontend use the same function.
- **Roles** are tenant-scoped rows (`Role`), with seven seeded system roles per tenant: Super Admin (`*`), Admin, Project Manager, Team Lead, Contributor, Viewer, Client (`portal.*`). Tenants can create custom roles.
- Project-level access is layered on top via `ProjectMember.role` (`MANAGER | LEAD | CONTRIBUTOR | VIEWER`).

## White-label Skin System

The "Skin" is `Organization.branding` (JSON). Shape (documented in `schema.prisma` and `docs/customization.md`):

```
{ theme: { cssVars... }, logoUrl, faviconUrl, loginBackgroundUrl,
  emailHeaderHtml, emailFooterHtml, terminology: { "project": "Job", ... },
  iconPack, smtp: {...} }
```

Runtime flow:

1. Web app resolves the tenant (subdomain → API `GET /branding` on first paint, cached).
2. `theme` values are emitted as **CSS custom properties** on `:root` (`--color-primary`, etc.) — no rebuild needed per tenant.
3. `terminology` feeds the **terminology engine** (`packages/shared/src/terminology.ts`): every UI string that names a domain concept resolves through `resolveTerm(key, overrides)` against `DEFAULT_TERMINOLOGY`, with `INDUSTRY_TERMINOLOGY` presets applied at onboarding (construction → "Job"/"Owner", software → "Ticket", healthcare → "Patient", etc.).
4. Transactional emails render with `emailHeaderHtml`/`emailFooterHtml`; tenants on higher plans can supply their own SMTP config.
5. `Tenant.customDomain` supports full white-label domains via CNAME.

## Module Map

Modules are toggled per tenant via `Tenant.enabledModules` JSON.

| Module | Key models | Notes |
|---|---|---|
| Projects & workflows | `Project`, `Stage`, `WorkflowTemplate`, `ProjectMember` | Templates ("Workflow DNA") define stages, default tasks, custom fields per industry |
| Tasks | `Task`, `TaskAssignee`, `TaskDependency` | Subtask hierarchy, fractional ordering, RRULE recurrence, 4 dependency types with lag/lead |
| Custom fields | `CustomFieldDefinition` | 17 field types incl. FORMULA, SIGNATURE, GPS_LOCATION, AI_GENERATED; per-entity |
| Files | `Folder`, `File`, `FileVersion` | Versioned, OCR text, expiry alerts, company drive vs project folders |
| Communication | `Comment`, `Activity`, `Notification` | Polymorphic comments with @mentions and proofing annotations; immutable activity feed |
| Time & finance | `TimeEntry`, `RateCard`, `Invoice`, `Expense`, `PurchaseOrder` | Money in minor units (BigInt cents); rate snapshots on time entries; PO/CO approval chains |
| Client portal | `ClientContact` | Separate credential set, granular `portalAccess` JSON, `clientVisible` flags on projects/tasks/files |
| Reporting | `Dashboard`, `Report` | JSON widget grids; no-code report definitions with schedules |
| Automations | `Automation`, `AutomationExecution`, `Webhook` | Node-based flow definitions, execution traces, HMAC-signed webhooks |
| Compliance & AI | `AuditLog`, `AiUsageLog` | Append-only audit; AI token/cost tracking per tenant |

## Real-time Design

- WebSocket gateway in `apps/api` (Socket.IO over the NestJS gateway), authenticated with the same access JWT.
- Rooms are namespaced by tenant then entity: `tenant:{id}`, `project:{id}`, `task:{id}` — a socket may only join rooms within its token's tenant.
- Server publishes domain events (task moved, comment added, timer started) after commit; the web app applies optimistic updates and reconciles.
- Redis pub/sub adapter fans events across API instances for horizontal scaling.
- Presence (who is viewing a project/task) is kept in Redis with TTL heartbeats.

## Queue Design (BullMQ)

All async work runs through BullMQ on Redis (`REDIS_URL`):

| Queue | Jobs |
|---|---|
| `notifications` | Notification fan-out (@mentions, assignments, due-soon), digest emails |
| `email` | Transactional email rendering + SMTP send (Mailpit in dev) |
| `automations` | Automation trigger evaluation and node execution; retries recorded on `AutomationExecution` (status `RETRYING`, `attempts`) |
| `files` | Post-upload processing: thumbnails, EXIF/metadata extraction, OCR (`File.ocrText`), search indexing |
| `search` | Meilisearch index sync for tasks/projects/files/comments |
| `reports` | Scheduled report generation (`Report.schedule`) → PDF/CSV/XLSX → email |
| `recurrence` | RRULE expansion for recurring tasks; due-date scanners |
| `ai` | Transcription, doc analysis, generation jobs; usage logged to `AiUsageLog` |

Conventions: idempotent job handlers keyed by entity id + event id, exponential backoff, dead-letter review queue, per-tenant rate limits on expensive queues (`ai`, `reports`).

## File Storage Flow (presigned uploads)

1. Client requests an upload slot: `POST /files` with name/mime/size (validated against `FILE_TOO_LARGE` / `FILE_TYPE_NOT_ALLOWED` rules).
2. API creates the `File` + pending `FileVersion` row and returns a **presigned PUT URL** for MinIO/S3 (`S3_BUCKET=flowos-files`), keyed `tenants/{tenantId}/files/{fileId}/{version}`.
3. Client uploads directly to object storage — file bytes never transit the API.
4. Client confirms (`POST /files/:id/versions/:v/complete`); API verifies size/checksum, marks the version live, and enqueues `files` jobs (thumbnail, OCR, indexing).
5. Downloads are presigned GET URLs, short-lived, permission-checked (`files.download`, plus `clientVisible` for portal users).

## Audit Logging

`AuditLog` is append-only by design (no `updatedAt`/`deletedAt`): who (`userId`), what (`action` like `auth.login`, `data.export`), on what (`entityType`/`entityId`), from where (`ip`, `userAgent`), plus `metadata`. Written by an API interceptor for sensitive actions and by domain services for explicit events. `tenantId` is nullable for platform-level events. Retention and export are covered in `docs/security.md`.
