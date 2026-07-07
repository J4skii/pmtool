# Praeto Sheets Sync

A project management dashboard for Praeto that syncs live from Google Sheets. Supports Board, Timeline, and Table views. Reads happen through a Google Cloud service account — no per-user login required.

---

## ⚠ Critical: share every sheet with the service account

**For syncing to work, each Google Sheet must be shared with the backend's service account email (Viewer access is enough).**

See [SETUP.md](./SETUP.md) for how to create the service account and find its email. Once you have it, share the sheet like you would with any collaborator — just paste that email into the sheet's Share dialog.

---

## Features

- **Live Google Sheets sync** — pulls every 5 minutes via the Sheets API
- **Multi-sheet management** — add, switch, and remove sheets from the dashboard UI
- **Three views** — Board (Kanban), Timeline (Gantt), Table (sortable)
- **Status tracking** — toggle tasks between To do, In progress, Done, Blocked
- **KPIs** — due today, this week, overdue, completion %
- **Owner & priority filters**
- **Manual import** — drag-and-drop XLSX/CSV fallback if the backend isn't running

---

## Quick start (local)

```bash
cd backend
cp .env.example .env
# paste your service account JSON key into GOOGLE_SERVICE_ACCOUNT_KEY in .env
npm install
npm run dev
```

In a second terminal, serve the dashboard:

```bash
# Any static server works — Python is the simplest:
python3 -m http.server 3000
# or: npx http-server -p 3000
```

Open `http://localhost:3000/Praeto%20Projects.dc.html`, click **⚙ Sheets**, and add your first Google Sheet link.

---

## How it works

```
Dashboard (HTML) ──→ Backend (Node.js) ──→ Google Sheets API ──→ Google Sheets
```

The backend authenticates as a Google Cloud service account and calls `spreadsheets.values.get` on the requested sheet ID. Sheet links are stored in the browser's localStorage and sent to the backend on each sync request — no OAuth, no user sign-in, no Azure.

**Backend endpoints:**
- `GET /api/data?sheetId=<sheet URL or ID>` — fetch and parse the sheet
- `GET /api/service-account` — returns the service account's email (for the Share step)
- `GET /health` — health check

---

## Project structure

```
.
├── backend/
│   ├── server.js           # Express + Google Sheets API
│   ├── package.json
│   ├── vercel.json         # Vercel serverless config
│   └── .env.example        # Copy to .env
├── Praeto Projects.dc.html # Dashboard
├── support.js              # dc-runtime (component system)
├── SETUP.md                # Deployment guide
└── README.md
```

---

## Deployment

**Backend:** [Vercel](https://vercel.com) (free, serverless — no persistent state needed)
**Frontend:** Any static host — [Vercel](https://vercel.com), [GitHub Pages](https://pages.github.com), [Netlify](https://netlify.com)

See **[SETUP.md](./SETUP.md)** for step-by-step instructions.

---

## Environment variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Full JSON key for the Google Cloud service account | Yes |
| `FRONTEND_URL` | Dashboard origin (CORS) | No — defaults to `*` |
| `PORT` | Local dev port | No — defaults to `3001` |

No Azure credentials. No session secret. No database.

---

## Tech stack

**Backend:** Node.js 18+, Express, Google Sheets API (`googleapis`)
**Frontend:** Vanilla HTML/CSS/JS, dc-runtime (streaming template system), SheetJS (manual import fallback)

---

## Roadmap

- [ ] Inline task editing
- [ ] Multi-user real-time collaboration
- [ ] Comments & notes per task
- [ ] Export to PDF / PowerPoint
- [ ] Time tracking & burndown
- [ ] Recurring tasks

---

Made for Praeto — insurance brokerage project management.
