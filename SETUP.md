# Praeto Sheets Sync — Setup Guide

---

## How it works

The dashboard reads live data from Google Sheets using a Google Cloud **service account** — a robot account that has no login of its own. You share each sheet with that account (like sharing with a colleague), and the backend reads it with a private key. No user OAuth, no admin consent, no per-user login.

```
Dashboard → /api/data?sheetId=... → Backend (service account key) → Google Sheets API → JSON
```

---

## One-time Google Cloud setup (~5 minutes)

You only do this once.

### Step 1 — Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Top-left project dropdown → **New Project** → name it `Praeto Sync` → **Create**
3. Make sure the new project is selected in the dropdown

### Step 2 — Enable the Google Sheets API

1. Go to **APIs & Services → Library**
2. Search **Google Sheets API** → click it → **Enable**

### Step 3 — Create a service account

1. Go to **APIs & Services → Credentials**
2. **Create Credentials → Service account**
3. Name: `praeto-sheets-sync` → **Create and continue** → **Done** (skip the optional role/access steps)
4. Click the new service account in the list → **Keys** tab → **Add key → Create new key → JSON** → **Create**
5. A `.json` file downloads — **keep it safe, it's a credential**

### Step 4 — Note the service account's email

Open the downloaded JSON file and find `"client_email"` — it looks like:

```
praeto-sheets-sync@praeto-sync.iam.gserviceaccount.com
```

You'll share every Google Sheet with this email (Step 6).

### Step 5 — Add the key to Vercel

1. Go to [vercel.com](https://vercel.com) → your backend project (`pmtool-4-praeto`)
2. **Settings → Environment Variables** → add:

| Name | Value |
|------|-------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | *(paste the entire contents of the downloaded JSON file, as one line)* |
| `FRONTEND_URL` | `https://pmtool-4-praeto.vercel.app` |

3. Click **Save** — Vercel will automatically redeploy

### Step 6 — Share a sheet and test

1. Open the target Google Sheet → **Share**
2. Paste in the service account email from Step 4 → set role to **Viewer** → **Send** (no notification needed)
3. Visit `https://pmtool-4-praeto.vercel.app/api/service-account` — it should return `{"email": "..."}`. If it returns an error, the key wasn't pasted correctly in Vercel.

---

## Adding sheets (ongoing)

1. Open the dashboard → click **⚙ Sheets**
2. The service account email is shown at the top — share the new Google Sheet with that email first (Viewer access)
3. Enter a name (e.g. `Pipeline`) and paste the sheet's URL
4. Click **Add sheet** — it syncs automatically

Sheet links are stored in your browser's `localStorage`. Anyone using the dashboard needs to add their own sheet links, but doesn't need any login of their own — the backend's service account handles all reads.

---

## Local development

### 1. Prerequisites

- Node.js 18+ installed

### 2. Configure backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and paste your downloaded JSON key as the value of `GOOGLE_SERVICE_ACCOUNT_KEY` (one line, valid JSON).

### 3. Install and run

```bash
npm install
npm run dev
```

### 4. Serve the dashboard

```bash
# From the project root:
python3 -m http.server 3000
```

Open `http://localhost:3000/Praeto%20Projects.dc.html`

---

## Troubleshooting

### "Service account not configured on server"
`GOOGLE_SERVICE_ACCOUNT_KEY` is missing or isn't valid JSON. Re-copy the full contents of the downloaded key file — don't truncate or reformat it.

### "Cannot access this sheet" (`NOT_SHARED`)
The sheet hasn't been shared with the service account email, or was shared with the wrong one. Open the sheet → Share → add the exact email from `/api/service-account` → Viewer.

### Sync succeeds but shows wrong data
The parser expects:
- Column A: project codes (`A1`, `B2`) or task numbers (`1.1`, `1.2`)
- Column B: name
- Columns C–F: owner, priority, start date, finish date
- Data starts on row 4 (rows 1–3 are headers)

---

## Architecture

```
┌──────────────────────────────┐
│  Dashboard (HTML)            │  Praeto Projects.dc.html
│  · Sheets in localStorage    │
└──────────┬───────────────────┘
           │ GET /api/data?sheetId=...
┌──────────▼───────────────────────────────────────────┐
│  Backend (Node.js + Express on Vercel)               │
│  · Authenticates as the service account               │
│  · Calls Google Sheets API                            │
│  · Returns parsed JSON                                │
└──────────┬───────────────────────────────────────────┘
           │ service account key
┌──────────▼──────────────────────────────┐
│  Google Sheets API                      │
│  spreadsheets.values.get                │
└─────────────────────────────────────────┘
```
