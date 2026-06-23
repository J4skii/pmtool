# Praeto Excel Sync

A project management dashboard for Praeto that syncs live from OneDrive Excel files. Supports Board, Timeline, and Table views. No OAuth, no Azure setup — just a public OneDrive share link.

---

## ⚠ Critical: Share links must be public

**For syncing to work, every OneDrive Excel file must be shared as "Anyone with the link can view".**

In OneDrive:
1. Right-click the file → **Share**
2. Change link setting to **"Anyone with the link"**
3. Set permission to **"Can view"**
4. Copy the link

If the link is set to "People in your organisation only" or requires a password, the sync will fail with a `NOT_PUBLIC` error.

---

## Features

- **Live Excel sync** — pulls from OneDrive every 5 minutes via Microsoft Graph (no OAuth required)
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
npm install
npm run dev
```

In a second terminal, serve the dashboard:

```bash
# Any static server works — Python is the simplest:
python3 -m http.server 3000
# or: npx http-server -p 3000
```

Open `http://localhost:3000/Praeto%20Projects.dc.html`, click **⚙ Sheets**, and add your first OneDrive share link.

---

## How it works

```
Dashboard (HTML) ──→ Backend (Node.js) ──→ Microsoft Graph API ──→ OneDrive
```

The backend converts an OneDrive share URL into a Microsoft Graph anonymous share token and downloads the Excel file — no Microsoft login, no OAuth, no Azure app registration needed. Sheet share links are stored in the browser's localStorage and sent to the backend on each sync request.

**Backend endpoints:**
- `GET /api/data?shareUrl=<encoded link>` — download and parse the Excel file
- `GET /health` — health check

---

## Project structure

```
.
├── backend/
│   ├── server.js           # Express + Microsoft Graph + Excel parsing
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

The backend only needs one optional variable:

| Variable | Purpose | Default |
|----------|---------|---------|
| `FRONTEND_URL` | Dashboard origin (CORS) | `*` (all origins) |
| `PORT` | Local dev port | `3001` |

No Azure credentials. No session secret. No database.

---

## Tech stack

**Backend:** Node.js 18+, Express, Microsoft Graph API (anonymous), SheetJS (xlsx)  
**Frontend:** Vanilla HTML/CSS/JS, dc-runtime (streaming template system), SheetJS

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
