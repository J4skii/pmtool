# Praeto Excel Sync

A real-time project management dashboard that syncs live with your OneDrive Excel file. Built with Node.js backend (OAuth2 + Microsoft Graph) and a responsive HTML dashboard (Board, Timeline, Table views).

## Features

✅ **Live Excel Sync** — Automatically pulls your OneDrive Excel file every 5 minutes  
✅ **OAuth2 Authentication** — Secure Microsoft login, no credentials stored  
✅ **Multi-Sheet Support** — Switch between sheets in the UI  
✅ **Three Views** — Board (Kanban), Timeline (Gantt), Table (sortable)  
✅ **Status Tracking** — Toggle tasks between To do, In progress, Done, Blocked  
✅ **Smart KPIs** — Due today, this week, overdue, completion %  
✅ **Owner & Priority Filters** — Slice data by who's assigned and urgency  
✅ **Free Hosting** — Deploy backend on Vercel, dashboard on GitHub Pages/Vercel  

## Quick Start

1. **Create a Microsoft Azure app** — [Follow SETUP.md (5 min)](./SETUP.md)
2. **Run backend locally:**
   ```bash
   cd backend && npm install && npm run dev
   ```
3. **Run dashboard:**
   ```bash
   # Serve the HTML file on localhost:3000
   python3 -m http.server 3000
   ```
4. **Sign in & sync** — Click "Sign in with Microsoft" in the dashboard

See **[SETUP.md](./SETUP.md)** for detailed instructions, Azure setup, and Vercel deployment.

## Architecture

```
Dashboard (HTML) ←→ Backend (Node.js) ←→ Microsoft Graph API ←→ OneDrive
```

**Backend:**
- `POST /api/sync` — Fetch & parse Excel from OneDrive
- `GET /api/data/:sheet` — Return synced projects for a sheet
- `GET /api/auth/login` — Start OAuth2 flow
- `GET /api/auth/status` — Check authentication

**Dashboard:**
- Auto-syncs every 5 minutes
- Persists task status overrides in browser localStorage
- Supports manual CSV/XLSX imports as fallback

## Project Structure

```
.
├── backend/
│   ├── server.js           # Express + OAuth + Excel parsing
│   ├── package.json
│   └── .env.example        # Copy to .env and fill in your Azure credentials
├── Praeto Projects.dc.html # Dashboard (Design Component)
├── SETUP.md                # Detailed setup & deployment guide
└── README.md              # This file
```

## Roadmap

Phase 2 (after live sync works):
- [ ] Inline task editing (add/delete/rename)
- [ ] Multi-user real-time collaboration (WebSocket)
- [ ] Comments & notes per task
- [ ] Recurring tasks & templates
- [ ] Time tracking & burndown
- [ ] Export to PDF/PowerPoint
- [ ] Undo/version history

## Tech Stack

**Backend:**
- Node.js 18+
- Express.js
- Microsoft Graph API (OAuth2)
- XLSX (Excel parsing)

**Frontend:**
- Vanilla HTML/CSS/JS (no frameworks)
- Design Component (streaming template system)
- SheetJS for local imports

## Deployment

**Backend:** Railway, Koyeb, or Render (persistent Node.js required — see SETUP.md)  
**Frontend:** [Vercel](https://vercel.com), [GitHub Pages](https://pages.github.com), or [Netlify](https://netlify.com)

See [SETUP.md](./SETUP.md) for step-by-step.

## Environment Variables

```
AZURE_CLIENT_ID=<from Azure Portal>
AZURE_CLIENT_SECRET=<from Azure Portal>
ONEDRIVE_SHARE_LINK=https://1drv.ms/...your-excel...
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
```

## License

MIT — Use freely, modify as needed.

---

**Made for Praeto** — Insurance brokerage project management.  
Questions? Check [SETUP.md](./SETUP.md) or review the backend logs.
