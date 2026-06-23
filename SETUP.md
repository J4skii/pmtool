# Praeto Excel Sync — Setup Guide

## Quick Start

### 1. Prerequisites
- Node.js 18+ installed
- A Microsoft account (free)
- The OneDrive Excel file shared link

### 2. Create Azure App Registration (5 min)

1. Go to **[Azure Portal](https://portal.azure.com)** → sign in with your Microsoft account
2. Search for **"App registrations"** → click **New registration**
3. Fill in:
   - **Name:** `Praeto Excel Sync`
   - **Redirect URI:** `http://localhost:3001/api/auth/callback` (for local dev)
4. Click **Register**
5. Copy the **Application (client) ID** — save it
6. Go to **Certificates & secrets** → **New client secret**
7. Copy the **Value** (not the ID) — this is your `CLIENT_SECRET`
8. Done!

### 3. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
AZURE_CLIENT_ID=<paste your client ID>
AZURE_CLIENT_SECRET=<paste your secret>
ONEDRIVE_SHARE_LINK=https://1drv.ms/x/...your-share-link...
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
```

### 4. Run Backend Locally

```bash
cd backend
npm install
npm run dev
```

You should see:
```
🚀 Praeto Excel Sync Backend running on port 3001
📝 OAuth login: http://localhost:3001/api/auth/login
```

### 5. Run Dashboard

In another terminal:
```bash
# The dashboard already exists as Praeto Projects.dc.html
# Serve it with any HTTP server:
python3 -m http.server 3000
# or
npx http-server -p 3000
```

### 6. Test OAuth Flow

1. Open dashboard: `http://localhost:3000/Praeto%20Projects.dc.html`
2. Click **"Sign in with Microsoft"** button (appears when sync fails)
3. You'll be redirected to Microsoft login
4. Authorize the app to access your OneDrive
5. Dashboard should now sync successfully every 5 min

---

## Deploying to Vercel (Free)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Praeto Excel Sync"
git remote add origin https://github.com/YOUR_USERNAME/praeto-excel-sync.git
git push -u origin main
```

### Step 2: Deploy Backend on Vercel

1. Go to **[vercel.com](https://vercel.com)** → sign in with GitHub
2. Click **New Project** → select your repo
3. **Framework:** Node.js
4. **Root Directory:** `./backend`
5. Add environment variables:
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`
   - `SESSION_SECRET`
   - `ONEDRIVE_SHARE_LINK`
   - `FRONTEND_URL=https://your-frontend-domain.com` (update after frontend deploys)
   - `BACKEND_URL=https://your-backend.vercel.app`
6. Click **Deploy**

You'll get a URL like: `https://praeto-backend.vercel.app`

### Step 3: Update Azure App

In Azure Portal → your app registration:
1. Go to **Authentication** → **Redirect URIs**
2. Add: `https://praeto-backend.vercel.app/api/auth/callback`
3. Save

### Step 4: Deploy Frontend (Dashboard)

The dashboard is a static HTML file. Options:
- **Vercel:** Upload `Praeto Projects.dc.html` as a static file (easiest)
- **GitHub Pages:** Free static hosting
- **Netlify:** Drag & drop HTML file

Update the dashboard's `backendUrl` prop to point to your Vercel backend:

In your HTML, add to the component:
```html
<dc-import name="Praeto Projects" backendUrl="https://praeto-backend.vercel.app"></dc-import>
```

Or set it in localStorage from the page that loads it.

---

## Testing the Full Flow

1. Dashboard loads → tries to sync from backend
2. Backend checks for valid token — if missing, shows "Sign in with Microsoft"
3. Click "Sign in" → redirected to Microsoft login
4. Authorize → redirected back with token
5. Dashboard auto-syncs → displays your Excel data
6. Every 5 min, dashboard pulls latest from OneDrive via backend

---

## Troubleshooting

### "Backend not responding"
- Make sure backend is running: `npm run dev` in `/backend`
- Check `BACKEND_URL` and `FRONTEND_URL` in `.env`

### "Sign-in fails"
- Verify `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` are correct
- Check that redirect URI in Azure matches `BACKEND_URL/api/auth/callback`

### "Excel not parsing"
- Make sure your sheet structure matches the expected format (projects in rows with tasks as subtasks)
- Check backend logs for detailed parse errors

### "Multi-sheet not showing"
- After sync, check browser console for available sheets
- Select a sheet from the dropdown in the header

---

## Architecture

```
┌─────────────────┐
│  Dashboard      │  (Praeto Projects.dc.html)
│  (Browser)      │
└────────┬────────┘
         │ /api/sync, /api/data/:sheet
         │
┌────────▼────────────────────────────┐
│  Backend (Node.js + Express)        │
│  - OAuth2 + Microsoft Graph         │
│  - OneDrive polling + Excel parsing │
└────────┬────────────────────────────┘
         │ (with access token)
┌────────▼────────────────────────┐
│  Microsoft Graph API            │
│  (OneDrive file download)       │
└─────────────────────────────────┘
```

---

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `AZURE_CLIENT_ID` | Microsoft app ID | `a1b2c3d4-...` |
| `AZURE_CLIENT_SECRET` | Microsoft app secret | `~kL.xxx_yyy` |
| `SESSION_SECRET` | Encrypt session cookies | `my-super-secret-key` |
| `ONEDRIVE_SHARE_LINK` | Default Excel file URL | `https://1drv.ms/...` |
| `FRONTEND_URL` | Dashboard origin (CORS) | `http://localhost:3000` |
| `BACKEND_URL` | API server origin | `http://localhost:3001` |
| `AZURE_TENANT_ID` | Microsoft tenant | `common` (multi-tenant) |

---

## Next Steps

Once live sync is working:
- [ ] Add inline task editing
- [ ] Multi-user real-time collaboration
- [ ] Comments & task notes
- [ ] Export/reporting
- [ ] Recurring tasks
- [ ] Time tracking

---

Questions? Check the backend logs:
```bash
npm run dev
# Look for error messages in the terminal
```
