# FlowOS Security

## Threat Model Summary

FlowOS is a multi-tenant SaaS holding business-critical data (projects, finances, client PII, files). Principal threats, in priority order:

| Threat | Vector | Primary mitigations |
|---|---|---|
| Cross-tenant data leakage | Missing `tenantId` filter, IDOR on UUIDs | Tenant context + Prisma guard, per-request tenant assertion, tests per module |
| Account takeover | Credential stuffing, token theft | bcrypt (cost 12), rate limiting, TOTP 2FA, rotating refresh tokens with reuse detection |
| Privilege escalation | Role/permission tampering | Server-side `hasPermission()` checks on every route; roles are tenant-scoped rows; clients never send permissions |
| Injection | SQL/NoSQL/XSS via rich text | Prisma parameterized queries, Zod boundary validation, TipTap JSON sanitization on render, CSP |
| Malicious files | Uploaded executables, XSS via SVG | Mime/size validation (`FILE_TYPE_NOT_ALLOWED`, `FILE_TOO_LARGE`), presigned URLs, no inline serving from app origin |
| SSRF / webhook abuse | Outgoing automation webhooks | URL allow-listing (block private ranges), HMAC signing, per-tenant delivery limits |
| Data exfiltration | Bulk export abuse | `data.export` audit events, export permissions, rate limits |
| Supply chain | Dependency compromise | Lockfile, Dependabot/CodeQL (`.github/workflows/codeql.yml`), minimal image builds |

## Tenant Isolation

Shared-schema isolation (see `docs/architecture.md`):

- Every tenant-scoped table carries an indexed `tenantId`; every query must filter by it. A request-scoped tenant context (resolved JWT → header → subdomain) feeds a Prisma client extension that injects/asserts the filter — code that "forgets" the filter fails closed.
- `Membership` is the only bridge between global `User` and a tenant; tenant switch re-issues tokens with the new `tenantId` claim.
- Object storage keys are prefixed `tenants/{tenantId}/…`; presigned URLs are generated only after a permission check and expire quickly.
- WebSocket rooms are tenant-namespaced; join requests are validated against the socket's token claims.
- Client portal users (`ClientContact`) are a separate credential population with `portal.*` permissions and `clientVisible` flags — they can never resolve internal-only records.

## Authentication Hardening

- Passwords: bcrypt cost 12 (see `packages/database/prisma/seed.ts`); policy enforced by `registerSchema` (min 10 chars, upper/lower/digit).
- Access JWT 15 min; refresh tokens 7 days, stored **hashed** (`RefreshToken.tokenHash`) with UA/IP, httpOnly + Secure + SameSite cookies, rotated on every use; reuse of a rotated token revokes the family.
- TOTP 2FA (`User.totpSecret`/`totpEnabled`); failed logins and 2FA failures are audit-logged (`auth.login_failed`).
- Suspended/deactivated users (`UserStatus`) and inactive tenants (`TENANT_INACTIVE`) are rejected before authorization.

## Rate Limiting

- Global: `RATE_LIMIT_MAX=120` req / `RATE_LIMIT_TTL=60`s per user+IP (Redis-backed), returning `429` / `RATE_LIMITED`.
- Stricter buckets: login, refresh, 2FA verify, password reset, portal login, and expensive endpoints (exports, AI, report runs).
- Queue-level per-tenant throttles on `ai` and `reports` jobs to prevent noisy-neighbor cost abuse.

## HTTP Security Headers

Served by the API (helmet) and Next.js config:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy` — self + tenant CDN origins; no `unsafe-eval`; frame-ancestors none (portal embeds get an explicit allowlist)
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/geolocation only where field features need them)
- CORS: explicit origin allowlist per tenant domain (`Tenant.customDomain` + `*.flowos.app`); credentials only on known origins.

## Secrets Handling

- No secrets in source, images, or logs. Local dev uses `.env` (git-ignored); `.env.example` documents every variable with placeholder values only.
- CI/CD uses GitHub Actions secrets and OIDC (`role-to-assume`, see `.github/workflows/deploy.yml`); `GITHUB_TOKEN` permissions are minimal per workflow.
- Production: a managed secret store (AWS Secrets Manager / SSM, or K8s sealed secrets) injected as env at runtime; JWT secrets rotated on a schedule; per-tenant webhook secrets (`Webhook.secret`) and SMTP credentials encrypted at rest.
- Guidance from repo config: generate secrets with `openssl rand -base64 32`; never commit `.env` (enforced by `.gitignore`).

## Audit Log

`AuditLog` (append-only, no update/delete columns by design) captures: `action` (`auth.login`, `auth.login_failed`, `task.view`, `data.export`, …), actor, entity, IP, user agent, metadata, timestamp. Written for authentication events, permission-sensitive reads, all exports, settings/branding/role changes, and finance approvals. Tenants query it with `audit.read` / export with `audit.export`. Platform-level events use `tenantId = null`.

## Compliance (placeholders — formalize before enterprise sales)

- **SOC 2 (Type II)**: control mapping planned across change management (PR template + CI gates), access control (RBAC + audit log), and availability (backups below). Evidence collection to be automated.
- **GDPR**: `Tenant.dataRegion = EU` pins residency; DSR support via user export/delete workflows (soft-delete → purge job); DPA template pending.
- **HIPAA**: healthcare terminology preset exists, but FlowOS is **not** HIPAA-ready until BAA, encryption-at-rest attestation, and access-review procedures are in place. Do not market to covered entities yet.
- **POPIA (South Africa)**: `dataRegion = ZA` supported in schema; information-officer designation and cross-border transfer clauses pending.

## Backup & Retention Strategy

- **PostgreSQL**: daily full snapshots + WAL/PITR (5-minute RPO target); retained 35 days rolling + monthly archives for 12 months. Quarterly restore drills into a staging environment.
- **Object storage**: S3 versioning + cross-region replication for production buckets; MinIO in dev is disposable.
- **Redis**: treated as ephemeral (cache/queues); AOF enabled only to survive restarts, never a system of record.
- **Meilisearch**: rebuildable from Postgres via the `search` queue; no independent backups needed.
- **Retention**: audit logs 2 years (then cold archive); soft-deleted rows purged 90 days after `deletedAt`; refresh tokens pruned after expiry; `AiUsageLog` aggregated after 12 months.
- **Tenant offboarding**: export bundle (JSON + files) on request, then hard purge across DB + object storage within 30 days, logged as platform-level audit events.

## Reporting a Vulnerability

Email security@flowos.app (placeholder) with details and reproduction steps. Please do not open public issues for security reports.
