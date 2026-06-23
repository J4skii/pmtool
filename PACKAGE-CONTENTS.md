# PACKAGE CONTENTS

## Files Included in This Project

### Root Level
- **README.md** — Project overview, features, quick start
- **SETUP.md** — Detailed setup guide (local + Vercel deployment)
- **PROJECT-SUMMARY.md** — Complete summary of what you have
- **.gitignore** — Git ignore rules (node_modules, .env, logs, etc.)
- **Praeto Projects.dc.html** — The dashboard (all-in-one file)

### Backend Folder (`/backend`)
- **server.js** — Express.js backend with OAuth2 + Excel polling
- **package.json** — Node.js dependencies
- **.env.example** — Environment variables template (copy to .env)
- **vercel.json** — Vercel deployment configuration

---

## Total Files: 8

All files needed to run locally or deploy to production.

---

## Next Steps After Unzipping

1. **Extract zip** to a folder on your computer
2. **Read SETUP.md** → Follow section "Local Development Setup"
3. **Create Azure app** (5 min) → Get CLIENT_ID + SECRET
4. **Configure .env** → Paste credentials
5. **Run backend** → `cd backend && npm install && npm run dev`
6. **Run dashboard** → `python3 -m http.server 3000` (new terminal)
7. **Test** → Open http://localhost:3000/Praeto%20Projects.dc.html
8. **Push to GitHub** → When ready to deploy

---

## What Each File Does

| File | Purpose | Edit? |
|------|---------|-------|
| README.md | Project overview | No (reference only) |
| SETUP.md | Setup + deployment guide | No (reference only) |
| PROJECT-SUMMARY.md | Complete summary | No (reference only) |
| .gitignore | Git ignore rules | No (unless adding files) |
| Praeto Projects.dc.html | Dashboard UI + logic | Yes (customize colors, text) |
| backend/server.js | OAuth2 + Excel sync | Maybe (advanced features) |
| backend/package.json | Dependencies | No (unless adding packages) |
| backend/.env.example | Env template | Copy to .env, fill in values |
| backend/vercel.json | Deployment config | No (use as-is) |

---

## .env File (Create This)

After extracting, in `/backend` folder:

```bash
cp .env.example .env
```

Then edit `.env` with:
- AZURE_CLIENT_ID (from Azure Portal)
- AZURE_CLIENT_SECRET (from Azure Portal)
- SESSION_SECRET (any random string)
- ONEDRIVE_SHARE_LINK (your Excel file URL)
- FRONTEND_URL (http://localhost:3000 for local)
- BACKEND_URL (http://localhost:3001 for local)

**⚠️ Don't commit .env to GitHub! It's in .gitignore.**

---

## Commands to Remember

```bash
# Install backend dependencies (run once)
cd backend && npm install

# Run backend locally (watch mode)
cd backend && npm run dev

# Run dashboard (new terminal, in project root)
python3 -m http.server 3000

# Push to GitHub
git add .
git commit -m "Initial: Praeto Excel Sync"
git push

# Deploy backend to Vercel (after GitHub push)
# Go to vercel.com → New Project → select repo → Deploy
```

---

## Support

**Before asking for help, check:**
1. SETUP.md (step-by-step guide)
2. Backend logs: `npm run dev` shows errors
3. Azure Portal: Verify CLIENT_ID/SECRET correct
4. Excel format: Matches expected structure

---

## Ready!

Extract this zip, follow SETUP.md, and you're good to go. 🚀

Questions? Check the README or SETUP guide first.
