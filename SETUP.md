# Praeto Excel Sync — Setup Guide

---

## ⚠ Before you begin: make your Excel file public

**This is the most important step.** The sync only works if your OneDrive file is shared as "Anyone with the link can view". No sign-in, no Azure, no OAuth — but the file must be publicly readable.

**In OneDrive:**
1. Right-click your Excel file → **Share**
2. Click the link settings (usually says "People in Praeto can view")
3. Change to **"Anyone with the link"**
4. Set to **"Can view"** (not edit)
5. Click **Apply** → **Copy link**

That link (starting with `https://1drv.ms/...`) is what you paste into the dashboard.

---

## Local development

### 1. Prerequisites

- Node.js 18+ installed
- The OneDrive Excel share link (from the step above)

### 2. Configure backend

```bash
cd backend
cp .env.example .env
```

The `.env` file only needs `FRONTEND_URL` if you want to restrict CORS. For local dev the defaults work fine — you can leave it as-is.

### 3. Install and run

```bash
npm install
npm run dev
```

You should see:
```
Praeto backend running on :3001
Data endpoint: GET http://localhost:3001/api/data?shareUrl=<1drv.ms link>
```

### 4. Serve the dashboard

In a separate terminal:

```bash
# From the project root (not /backend):
python3 -m http.server 3000
# or: npx http-server -p 3000
```

### 5. Add your first sheet

1. Open `http://localhost:3000/Praeto%20Projects.dc.html`
2. Click **⚙ Sheets** in the top-right of the header
3. Enter a name (e.g. `Pipeline`) and paste the share link
4. Click **Add sheet** — it syncs immediately

Sheet links are stored in your browser's localStorage. They persist between sessions.

---

## Deploying to Vercel (free)

### Step 1: Push to GitHub (if not already)

```bash
git add .
git commit -m "deploy: praeto excel sync"
git push
```

### Step 2: Deploy the backend

1. Go to [vercel.com](https://vercel.com) → sign in with GitHub
2. **New Project** → select your repo
3. Set **Root Directory** to `backend`
4. Add one environment variable:
   - `FRONTEND_URL` = `https://your-dashboard-url.com` (update after Step 3)
5. Click **Deploy**

You'll get a URL like `https://praeto-backend.vercel.app` — copy it.

### Step 3: Deploy the dashboard

The dashboard is a static HTML file. Options:

**Option A — Vercel static (easiest):**
1. New Vercel project → select same repo
2. Root Directory: `.` (project root)
3. Framework Preset: **Other**
4. Build Command: leave empty
5. Output Directory: `.`
6. Deploy

**Option B — Netlify drag-and-drop:**
1. Go to [netlify.com](https://netlify.com) → drag `Praeto Projects.dc.html` into the deploy zone

**Option C — GitHub Pages:**
Enable GitHub Pages in repo settings → source: main branch, root

### Step 4: Wire it up

In your deployed dashboard, the backend URL defaults to `http://localhost:3001`. To point it at your Vercel backend, open the dashboard HTML and find this line:

```js
const backend=this.props.backendUrl||'http://localhost:3001';
```

You can override it by editing the `<dc-import>` tag on the page that embeds the component, or by updating the default in the script. The simplest fix: update the fallback URL:

```js
const backend=this.props.backendUrl||'https://praeto-backend.vercel.app';
```

Then go back to your backend Vercel project → **Settings → Environment Variables** → update `FRONTEND_URL` to your dashboard's deployed URL.

---

## Adding a new sheet (ongoing)

When Praeto adds a new project tracking sheet to OneDrive:

1. Share it as "Anyone with the link can view" (see top of this guide)
2. Open the dashboard → **⚙ Sheets**
3. Enter the sheet name and paste the share link
4. Click **Add sheet**

The sheet is saved to your browser. Each person using the dashboard needs to add their own links — or you can pre-configure them by editing the default `sheets` in the constructor if you want them hardcoded.

---

## Troubleshooting

### "NOT_PUBLIC" error on sync
The share link is not set to "Anyone with the link". Follow the sharing steps at the top of this guide. Company-only or password-protected links will not work.

### "Backend not responding"
- Local: make sure `npm run dev` is running in `/backend`
- Production: check the backend's Vercel deployment logs

### Sync succeeds but shows wrong data
- The parser expects project codes in column A (e.g. `A1`, `B2`) and task numbers in the form `1.1`, `1.2`
- Data starts on row 4 (rows 1–3 are treated as headers)
- Check the backend terminal for parse errors

### Sheet links reset after browser clear
Sheet links live in `localStorage` under `praeto-sheets-v1`. Clearing browser data removes them — just re-add them via ⚙ Sheets.

---

## Architecture

```
┌──────────────────────────┐
│  Dashboard (HTML)        │  Praeto Projects.dc.html
│  · Sheet registry in     │  stored in browser localStorage
│    localStorage          │
└──────────┬───────────────┘
           │ GET /api/data?shareUrl=<public 1drv.ms link>
┌──────────▼───────────────────────────────────────────┐
│  Backend (Node.js + Express, hosted on Vercel)       │
│  · Encodes share URL → Graph anonymous share token   │
│  · Downloads file from Microsoft Graph (no auth)     │
│  · Parses Excel with SheetJS                         │
│  · Returns JSON to dashboard                         │
└──────────┬───────────────────────────────────────────┘
           │ anonymous download (no login needed)
┌──────────▼───────────────────┐
│  Microsoft Graph API         │
│  /v1.0/shares/u!.../         │
│  driveItem/content           │
└──────────────────────────────┘
```

No OAuth. No tokens. No database. The only requirement is the OneDrive file being publicly shared.
