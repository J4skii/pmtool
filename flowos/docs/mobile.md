# FlowOS Mobile Strategy

## Approach: PWA first

The primary mobile client is the Next.js web app (`apps/web`) shipped as a **Progressive Web App**:

- Web app manifest with tenant branding (name, icons, theme color pulled from the Skin — see `docs/customization.md`), so an installed FlowOS looks like the tenant's own app.
- Service worker (Workbox via `next-pwa` or equivalent) providing install prompt, offline shell, and push.
- Responsive App Router layouts: bottom tab navigation under the `md` breakpoint, touch-friendly board/list views, camera capture for receipts, barcodes (`BARCODE` custom fields), and site photos, geolocation for `GPS_LOCATION` fields.
- Web Push notifications using the VAPID keys already defined in `.env.example` (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`), fanned out from the `notifications` queue.

Why PWA first: one codebase, instant tenant white-labeling without app-store review per brand, and field workers can install directly from the tenant's own domain.

## Offline Strategy

Tiered, pragmatic offline support rather than full sync:

1. **App shell + static assets** — precached by the service worker; the app always opens.
2. **Read cache** — recently viewed projects, task lists, and files metadata cached in IndexedDB (stale-while-revalidate). Users can browse what they last saw on-site with no signal.
3. **Outbox for mutations** — a queue of pending writes (create/update task, time entry start/stop, comment, expense with photo) persisted to IndexedDB and replayed via Background Sync when connectivity returns.
   - Replays go through the normal REST endpoints; idempotency keys prevent duplicates.
   - Conflicts resolve last-write-wins per field, with the activity feed (`Activity`) preserving both sides; conflicting edits surface a non-blocking toast.
4. **Timer resilience** — a running timer stores `startedAt` locally, so stopping offline computes a correct `durationMins` on sync (`TimeEntry.endedAt` is null while running).
5. **Explicitly online-only** — dashboards/reports, automations editing, finance approvals, and search (Meilisearch) require connectivity and show a clear offline state.

## React Native: future secondary client

A React Native (Expo) app is planned as a secondary client once the API surface stabilizes — not a replacement for the PWA:

- **Why**: deeper offline (SQLite mirror), reliable background location/push, NFC/Bluetooth hardware integrations for field industries, and app-store presence for enterprise MDM distribution.
- **Reuse**: `packages/shared` (Zod schemas, permission checks via `hasPermission`, terminology via `resolveTerm`, error codes) is intentionally platform-agnostic and will be consumed directly by the RN app. The REST + WebSocket API contracts in `docs/api.md` are the single source of truth.
- **White-labeling in RN**: one binary, runtime skinning — the app loads the tenant Skin after tenant selection, mirroring the web approach. Per-tenant store listings are out of scope initially.
- **Sequencing**: PWA gaps (background sync limits on iOS Safari, push reliability) are the trigger metrics for starting the RN build.
