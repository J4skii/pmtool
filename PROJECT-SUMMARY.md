# PROJECT SUMMARY — Praeto Excel Sync

## What You Have

A **complete, production-ready project management dashboard** with live OneDrive Excel sync:

### Dashboard (`Praeto Projects.dc.html`)
- **3 Views**: Board (Kanban), Timeline (Gantt), Table (sortable)
- **Live KPIs**: Projects, due today, due this week, urgent, completion %
- **Filtering**: By owner, priority, text search
- **Task Management**: Click to toggle status (To do → In progress → Done → Blocked)
- **Multi-Sheet Support**: Switch between Excel sheets in a dropdown
- **Status Persistence**: Task statuses saved in browser localStorage
- **Fallback Import**: Manual CSV/XLSX upload if auth fails

### Backend (`backend/server.js`)
- **OAuth2 Authentication**: Secure Microsoft login
- **Excel Polling**: Fetches your OneDrive file every 5 minutes
- **Multi-Sheet Parsing**: Extracts projects and tasks from Excel
- **RESTful API**:
  - `POST /api/sync` — Fetch & parse Excel
  - `GET /api/data/:sheet` — Get synced data
  - `GET /api/auth/login` — Start OAuth flow
  - `GET /api/auth/status` — Check auth status
  - `GET /health` — Health check

---

## How It Works

1. **User opens dashboard** → Tries to sync with backend
2. **Backend checks token** → If missing, shows "Sign in with Microsoft"
3. **User clicks Sign in** → Redirected to Microsoft login
4. **User authorizes** → Backend gets access token
5. **Backend fetches Excel** → Calls Microsoft Graph API
6. **Backend parses Excel** → Extracts projects & tasks
7. **Dashboard renders** → Shows Board/Timeline/Table
8. **Auto-sync every 5 min** → Background polling from OneDrive

---

## File Structure

```
praeto-excel-sync/
├── backend/
│   ├── server.js              ← Main Express server (OAuth + Excel sync)
│   ├── package.json           ← Dependencies
│   ├── .env.example           ← Template (copy to .env, fill in credentials)
│   └── vercel.json            ← Vercel deployment config
├── Praeto Projects.dc.html    ← Dashboard UI
├── README.md                  ← Project overview
├── SETUP.md                   ← Detailed setup & deployment guide
└── .gitignore                 ← Git ignore rules
```

---

## Quick Start (Local Testing)

### 1. Create Azure App (5 min)
1. Go to https://portal.azure.com
2. Search "App registrations" → New registration
3. Name: "Praeto Excel Sync"
4. Redirect URI: `http://localhost:3001/api/auth/callback`
5. Copy **Application (client) ID** and **client secret value**

### 2. Configure Backend
```bash
cd backend
cp .env.example .env
# Edit .env: paste CLIENT_ID, CLIENT_SECRET, set SESSION_SECRET
npm install
npm run dev
```

### 3. Run Dashboard
```bash
# New terminal, in project root
python3 -m http.server 3000
```

### 4. Test
- Open `http://localhost:3000/Praeto%20Projects.dc.html`
- Click "⟳ Live sync"
- Click "Sign in with Microsoft"
- Authorize → Dashboard syncs!

---

## Excel Format

Your OneDrive file should have:

```
Row 1-3: Headers (ignored)
Row 4+:

Col A: Code (A1, A2, 1.1, 1.2, ...)
Col B: Name (project or task name)
Col C: Owner (person assigned)
Col D: Priority (Urgent, High, Medium, Low)
Col E: Start Date (YYYY-MM-DD)
Col F: Finish Date (YYYY-MM-DD)

Example:
A1 | Iziko Holdings | Jared | High | 2026-06-01 | 2026-06-30
1.1 | Collect data | | | 2026-06-01 | 2026-06-10
1.2 | Analysis | Tiyane | High | 2026-06-10 | 2026-06-20
```

---

## Deployment (Production)

### Backend (Vercel)
1. Push to GitHub
2. Go to vercel.com → New Project → select repo
3. Framework: Node.js, Root: `./backend`
4. Add environment variables (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, SESSION_SECRET, ONEDRIVE_SHARE_LINK, FRONTEND_URL, BACKEND_URL)
5. Deploy → get URL like `https://praeto-backend.vercel.app`

### Update Azure
- Azure Portal → your app → Authentication
- Add redirect URI: `https://praeto-backend.vercel.app/api/auth/callback`

### Frontend (Vercel / GitHub Pages / Netlify)
- Upload `Praeto Projects.dc.html` to any static host
- Update dashboard to point to production backend URL

See **SETUP.md** for detailed step-by-step.

---

## Environment Variables (.env)

```
AZURE_CLIENT_ID=<your client ID from Azure>
AZURE_CLIENT_SECRET=<your secret value from Azure>
SESSION_SECRET=any-random-string-here
ONEDRIVE_SHARE_LINK=https://1drv.ms/...your-excel...
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
PORT=3001
NODE_ENV=development
```

---

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/auth/login` | No | Start OAuth2 flow |
| GET | `/api/auth/callback` | No | OAuth callback (automatic) |
| GET | `/api/auth/status` | No | Check if authenticated |
| POST | `/api/sync` | Yes | Fetch & parse Excel from OneDrive |
| GET | `/api/data/:sheet` | No | Get synced projects for a sheet |
| GET | `/api/status` | No | Get sync status & metadata |
| GET | `/health` | No | Health check |

---

## Troubleshooting

### Backend won't start
```bash
# Check Node version
node --version  # Should be 18+

# Check port 3001 is free
lsof -i :3001  # macOS/Linux

# Reinstall
cd backend && rm -rf node_modules && npm install
```

### "Sign in fails"
- Verify AZURE_CLIENT_ID and AZURE_CLIENT_SECRET in .env
- Check redirect URI in Azure Portal matches BACKEND_URL/api/auth/callback

### "Excel not syncing"
- Make sure ONEDRIVE_SHARE_LINK is correct
- Check Excel format matches expected structure (see above)
- Check backend logs: `npm run dev` shows errors

### "Can't connect to backend"
- Backend running? Check `npm run dev` terminal
- BACKEND_URL correct in .env?
- CORS enabled? Check FRONTEND_URL in .env

---

## Next Steps (After Testing Works)

**Phase 2 features to build:**
- [ ] Inline task editing (create, rename, delete)
- [ ] Real-time collaboration (WebSocket)
- [ ] Comments & notes per task
- [ ] Recurring tasks
- [ ] Time tracking
- [ ] Export/reporting
- [ ] Undo/version history

---

## Tech Stack

**Backend:**
- Node.js 18+
- Express.js (HTTP server)
- Passport.js + Azure AD (OAuth2)
- Microsoft Graph API (OneDrive)
- XLSX (Excel parsing)
- Axios (HTTP client)

**Frontend:**
- Vanilla HTML/CSS/JavaScript
- Design Components (streaming template)
- SheetJS (local imports)

---

## Support

1. **Local issues?** Check SETUP.md
2. **Backend logs?** Run `npm run dev` and watch terminal
3. **Deployment issues?** Check Vercel dashboard logs
4. **Excel format?** See "Excel Format" section above

---

## Key Features Summary

✅ Live OneDrive Excel sync (5 min polling)
✅ OAuth2 authentication (secure Microsoft login)
✅ Multi-sheet support (switch sheets in UI)
✅ Three views (Board, Timeline, Table)
✅ Task status tracking (toggleable: To do/In progress/Done/Blocked)
✅ KPIs (live projects, due dates, overdue, completion %)
✅ Filtering (owner, priority, search)
✅ Status persistence (localStorage)
✅ Manual import fallback (CSV/XLSX upload)
✅ Free hosting (Vercel, GitHub Pages)
✅ Fully documented (README + SETUP guide)

---

## Questions?

- Review **README.md** for overview
- Follow **SETUP.md** for local setup & deployment
- Check backend logs for debugging
- Verify Excel format matches expected structure

---

**Built for Praeto — Insurance brokerage project management.**

Good luck! 🚀
