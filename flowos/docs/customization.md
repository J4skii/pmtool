# FlowOS Customization Guide

Everything a tenant can rebrand or reshape without code. All structures below are stored as JSON on tenant-scoped rows (see `packages/database/prisma/schema.prisma`).

## The "Skin" JSON (`Organization.branding`)

The Skin controls theme, assets, email chrome, and terminology. Managed via `PATCH /v1/branding` (`branding.update` permission).

### Schema

| Key | Type | Description |
|---|---|---|
| `theme` | object | CSS variable overrides applied to `:root` at runtime |
| `logoUrl` | string | Header/login logo |
| `faviconUrl` | string | Favicon |
| `loginBackgroundUrl` | string | Login page background image |
| `emailHeaderHtml` | string | HTML injected above transactional email bodies |
| `emailFooterHtml` | string | HTML injected below transactional email bodies |
| `terminology` | object | Term overrides (see Terminology engine below) |
| `iconPack` | string | Icon set identifier (e.g. `"lucide"`, `"solid"`) |
| `smtp` | object | Optional tenant-own SMTP relay (higher plans) |

### Full example

```json
{
  "theme": {
    "--color-primary": "#ea580c",
    "--color-primary-foreground": "#ffffff",
    "--color-accent": "#f59e0b",
    "--color-background": "#fafaf9",
    "--color-surface": "#ffffff",
    "--color-sidebar": "#1c1917",
    "--radius": "8px",
    "--font-sans": "Inter, system-ui, sans-serif"
  },
  "logoUrl": "https://cdn.flowos.app/tenants/acme-build/logo.svg",
  "faviconUrl": "https://cdn.flowos.app/tenants/acme-build/favicon.png",
  "loginBackgroundUrl": "https://cdn.flowos.app/tenants/acme-build/login-bg.jpg",
  "emailHeaderHtml": "<img src=\"https://cdn.flowos.app/tenants/acme-build/email-logo.png\" height=\"40\" alt=\"Acme Build\" />",
  "emailFooterHtml": "<p>Acme Construction Co · 123 Site Rd · Unsubscribe</p>",
  "terminology": {
    "project": "Job",
    "projects": "Jobs",
    "task": "Work Item",
    "tasks": "Work Items",
    "client": "Owner",
    "clients": "Owners",
    "milestone": "Inspection",
    "milestones": "Inspections"
  },
  "iconPack": "lucide",
  "smtp": {
    "host": "smtp.acmebuild.com",
    "port": 587,
    "user": "noreply@acmebuild.com",
    "from": "Acme Build <noreply@acmebuild.com>"
  }
}
```

Runtime behavior: `theme` keys become CSS custom properties (no rebuild per tenant); everything else is read by the web app and the email renderer. See `docs/architecture.md` → White-label Skin System.

## Terminology Engine

Defined in `packages/shared/src/terminology.ts`.

- `DEFAULT_TERMINOLOGY` is the canonical English map (`project`, `projects`, `task`, `subtask`, `stage`, `milestone`, `client`, `team`, `budget`, `invoice`, `expense`, `report`, `dashboard`, `file`, `workflow`, `automation`, `timesheet`, and plurals).
- Industry presets (`INDUSTRY_TERMINOLOGY`) are applied at onboarding: `construction`, `software`, `healthcare`, `events`, `marketing`, `manufacturing`, `services`, `general`. Admins can override any key afterwards.
- Frontend usage: every domain-noun UI string resolves through the terminology context:

```tsx
const { t } = useTerminology();          // reads Organization.branding.terminology
<Button>{`New ${t('task')}`}</Button>     // "New Work Item" for acme-build
```

- Server-side (emails, PDFs, notifications) uses the same shared resolver:

```ts
import { resolveTerm } from '@flowos/shared';
resolveTerm('project', tenantTerminology); // "Job"
```

Only override the keys you need — `resolveTerm` falls back to defaults per key.

## Custom Field Types

Tenant admins define fields per entity (`project`, `task`, `client`, …) via `CustomFieldDefinition`. Supported types (`CustomFieldType` enum):

| Type | Notes / `config` |
|---|---|
| `TEXT` | Optional max length, regex validation |
| `NUMBER` | Min/max, decimals |
| `CURRENCY` | `{ "currency": "USD" }` — stored in minor units |
| `DATE` / `DATETIME` | |
| `DROPDOWN` | `{ "options": [{ "value", "label", "color" }] }` |
| `MULTI_SELECT` | Same options shape, multiple values |
| `CHECKBOX` | |
| `URL` / `EMAIL` / `PHONE` | Format-validated |
| `FILE` | Attachment reference |
| `SIGNATURE` | Captured signature image + signer metadata |
| `BARCODE` | Scanned via mobile camera |
| `GPS_LOCATION` | `{ lat, lng, accuracy }` captured on-site |
| `FORMULA` | `{ "expression": "budget - spent" }` — computed, read-only |
| `RELATIONSHIP` | `{ "entity": "client" }` — link to another record |
| `AI_GENERATED` | `{ "prompt": "Summarize this task" }` — filled by the AI queue |

`config` also supports validation rules and conditional logic: `{ "showIf": { "field": "type", "op": "eq", "value": "external" } }`. Values live on the record's `customFields` JSON keyed by the definition's `key`.

## Workflow Template Definition (`WorkflowTemplate.definition`)

Templates ("Workflow DNA") seed a project's stages, default tasks, and custom fields. `tenantId = null` marks global built-ins.

```json
{
  "industry": "construction",
  "stages": [
    { "key": "pre_construction", "name": "Pre-Construction", "color": "#a8a29e", "order": 0 },
    { "key": "permits",          "name": "Permits",          "color": "#f59e0b", "order": 1,
      "automations": [{ "on": "enter", "action": "notify", "config": { "role": "Project Manager" } }] },
    { "key": "foundation",       "name": "Foundation",       "color": "#f97316", "order": 2 },
    { "key": "framing",          "name": "Framing",          "color": "#3b82f6", "order": 3 },
    { "key": "finishing",        "name": "Finishing",        "color": "#8b5cf6", "order": 4 },
    { "key": "handover",         "name": "Handover",         "color": "#22c55e", "order": 5, "isDone": true }
  ],
  "defaultTasks": [
    { "title": "Submit permit application", "stage": "permits", "priority": "HIGH", "estimateMins": 480, "isMilestone": false },
    { "title": "Final inspection",          "stage": "handover", "isMilestone": true }
  ],
  "customFields": [
    { "entity": "task", "key": "site_location", "label": "Site Location", "type": "GPS_LOCATION" },
    { "entity": "task", "key": "inspector_signoff", "label": "Inspector Sign-off", "type": "SIGNATURE" }
  ]
}
```

## Module Toggles (`Tenant.enabledModules`)

Flat JSON of module → boolean; disabled modules disappear from navigation and their endpoints return `FORBIDDEN`:

```json
{
  "projects": true,
  "tasks": true,
  "files": true,
  "finance": true,
  "reports": true,
  "automations": false,
  "portal": true,
  "ai": true
}
```

Module keys align with the permission modules in `packages/shared/src/permissions.ts`; a permission grant is ineffective if its module is toggled off for the tenant.
