# FlowOS API Conventions

Base URL (dev): `http://localhost:4000` — all routes are versioned under `/v1`.

## Response Envelopes

**Success** — every response wraps the payload in `data`:

```json
{ "data": { "id": "…", "name": "Riverside Apartments" } }
```

**Lists** — paginated envelope (shape from `Paginated<T>` in `packages/shared/src/schemas.ts`):

```json
{
  "data": {
    "items": [ … ],
    "total": 137,
    "page": 1,
    "pageSize": 50
  }
}
```

**Errors** — structured body from `AppError.toBody()` (`packages/shared/src/errors.ts`):

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "dueDate must be a valid date",
    "details": { "field": "dueDate" }
  }
}
```

Error codes are the shared `ERROR_CODES` enum — e.g. `AUTH_INVALID_CREDENTIALS`, `AUTH_2FA_REQUIRED`, `TENANT_NOT_FOUND`, `PERMISSION_DENIED`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_FAILED`, `RATE_LIMITED`, `TASK_CIRCULAR_DEPENDENCY`, `TIMER_ALREADY_RUNNING`, `FILE_TOO_LARGE`, `INVOICE_IMMUTABLE`, `INTERNAL`. Frontend switches on `code`, never on `message`.

## Pagination, Sorting, Search

Query params validated by `paginationSchema`:

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | int ≥ 1 | 1 | |
| `pageSize` | int 1–200 | 50 | |
| `sortBy` | string | — | Whitelisted per endpoint |
| `sortDir` | `asc` \| `desc` | `desc` | |
| `search` | string ≤ 500 | — | Full-text via Meilisearch where supported |

All mutating endpoints validate bodies against the shared Zod schemas (`loginSchema`, `createProjectSchema`, `createTaskSchema`, `createTimeEntrySchema`, …), returning `VALIDATION_FAILED` with field details.

## Authentication Flow

- **Access token**: JWT, **15 minutes** (`JWT_ACCESS_TTL=15m`), sent as `Authorization: Bearer <token>`. Carries `sub` (userId), `tenantId`, and role permission hash.
- **Refresh token**: opaque, **7 days** (`JWT_REFRESH_TTL=7d`), stored **hashed** in the `RefreshToken` table with user-agent/IP, delivered as an httpOnly secure cookie. **Rotating**: each refresh invalidates the used token and issues a new one; reuse of a revoked token revokes the whole family (theft detection).
- **2FA (TOTP)**: if `User.totpEnabled`, login with valid credentials returns `AUTH_2FA_REQUIRED`; the client re-submits with `totpCode` (6 digits, per `loginSchema`).
- **Tenant selection**: `login` accepts optional `tenantSlug`; users with multiple memberships pick a tenant, which is baked into the access token. Switching tenants re-issues tokens.
- SSO (Google, Azure AD, SAML) is configured via env; SSO-only users have `passwordHash = null`.

```
POST /v1/auth/register        # creates user + tenant (registerSchema)
POST /v1/auth/login           # { email, password, totpCode?, tenantSlug? }
POST /v1/auth/refresh         # rotate refresh cookie → new access token
POST /v1/auth/logout          # revoke current refresh token
POST /v1/auth/2fa/setup       # returns TOTP secret + QR
POST /v1/auth/2fa/verify      # enable TOTP
```

## Endpoint Summary by Module

Permissions in parentheses are the shared catalog keys enforced per route.

### Tenancy & settings
- `GET /v1/tenant` · `PATCH /v1/tenant` (`settings.update`) — profile, `enabledModules`
- `GET /v1/branding` (public per subdomain) · `PATCH /v1/branding` (`branding.update`) — the Skin JSON
- `GET/POST/PATCH/DELETE /v1/roles` (`team.manage_roles`) — custom roles against the permission catalog
- `GET/POST/PATCH /v1/custom-fields` (`settings.manage_custom_fields`) — per-entity `CustomFieldDefinition`

### Team
- `GET /v1/members` · `POST /v1/members/invite` (`team.invite`) · `PATCH /v1/members/:id` (`team.update`) — memberships, rates, capacity

### Projects & workflows
- `GET/POST /v1/projects` (`projects.read` / `projects.create`)
- `GET/PATCH/DELETE /v1/projects/:id` · `POST /v1/projects/:id/archive` · `POST /v1/projects/:id/duplicate`
- `GET/POST/PATCH /v1/projects/:id/stages` (`projects.manage_stages`)
- `GET/POST/PATCH /v1/projects/:id/members` (`projects.manage_members`)
- `GET/POST /v1/workflow-templates` (`projects.manage_templates`)

### Tasks
- `GET/POST /v1/tasks` · `GET/PATCH/DELETE /v1/tasks/:id`
- `POST /v1/tasks/:id/move` (`tasks.move`) — stage + fractional order
- `POST /v1/tasks/:id/assignees` (`tasks.assign`) · `POST /v1/tasks/:id/complete` (`tasks.complete`)
- `POST /v1/task-dependencies` (`tasks.manage_dependencies`) — rejects cycles with `TASK_CIRCULAR_DEPENDENCY`

### Files
- `POST /v1/files` (`files.upload`) — returns presigned PUT URL (see `docs/architecture.md`)
- `POST /v1/files/:id/versions/:v/complete` · `GET /v1/files/:id/download` (`files.download`) — presigned GET
- `GET/POST /v1/folders` · file `tags`, `expiresAt`, `clientVisible`

### Comments & activity
- `GET/POST /v1/comments?entityType=&entityId=` (`comments.create`) — TipTap JSON body, @mentions, proofing annotations
- `GET /v1/activity?entityType=&entityId=` — immutable feed

### Time tracking
- `POST /v1/time-entries` (`time.track`) · `POST /v1/timers/start` / `POST /v1/timers/stop` (`TIMER_ALREADY_RUNNING` on double-start)
- `GET /v1/time-entries` (`time.read` own / `time.read_all`) · `POST /v1/time-entries/approve` (`time.approve`)

### Finance
- `GET/POST /v1/invoices` (`finance.invoices.read/create`) · `POST /v1/invoices/:id/send` (`finance.invoices.send`) · `POST /v1/invoices/:id/void` — sent invoices are immutable (`INVOICE_IMMUTABLE`)
- `GET/POST /v1/expenses` · `POST /v1/expenses/:id/approve` (`finance.expenses.approve`)
- `GET/POST /v1/purchase-orders` · `POST /v1/purchase-orders/:id/approve` (`finance.pos.approve`) — covers POs and change orders (`kind`)
- `GET/POST /v1/rate-cards` (`finance.rates.*`)

### Client portal (ClientContact credentials, `portal.*` permissions)
- `POST /v1/portal/auth/login` · `GET /v1/portal/projects` · `GET /v1/portal/invoices` · `POST /v1/portal/approvals/:id`

### Reporting
- `GET/POST/PATCH /v1/dashboards` (`dashboards.*`) — widget grid layouts
- `GET/POST /v1/reports` · `POST /v1/reports/:id/run` · schedules (`reports.schedule`)

### Automations & webhooks
- `GET/POST/PATCH /v1/automations` (`automations.*`) · `GET /v1/automations/:id/executions` (`automations.view_logs`)
- `GET/POST /v1/webhooks` (`automations.manage_webhooks`) — outgoing deliveries HMAC-signed with `Webhook.secret`

### AI
- `POST /v1/ai/chat` (`ai.chat`) · `POST /v1/ai/transcribe` (`ai.transcribe`) · `POST /v1/ai/analyze-document` — usage metered in `AiUsageLog`

### Audit & notifications
- `GET /v1/audit-logs` (`audit.read`) · `GET /v1/audit-logs/export` (`audit.export`)
- `GET /v1/notifications` · `POST /v1/notifications/:id/read`

## Rate Limiting

Global limiter from env: `RATE_LIMIT_MAX=120` requests per `RATE_LIMIT_TTL=60` seconds per user/IP; stricter buckets on auth endpoints. Exceeding returns `429` with code `RATE_LIMITED`.
