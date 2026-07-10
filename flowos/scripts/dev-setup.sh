#!/usr/bin/env bash
# FlowOS local dev setup (macOS / Linux / Git Bash)
# Usage: ./scripts/dev-setup.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "== FlowOS dev setup =="

# --- 1. Check prerequisites --------------------------------------------------
echo
echo "[1/6] Checking prerequisites..."

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not found. Install Node 20+ from https://nodejs.org" >&2
  exit 1
fi
NODE_MAJOR="$(node --version | sed 's/^v//' | cut -d. -f1)"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERROR: Node 20+ required (found $(node --version))." >&2
  exit 1
fi
echo "  Node $(node --version) OK"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker not found. Install Docker Desktop, or see the 'No Docker?' fallback in README.md." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon is not running. Start Docker Desktop and re-run." >&2
  exit 1
fi
echo "  Docker OK"

# --- 2. pnpm via corepack -----------------------------------------------------
echo
echo "[2/6] Enabling corepack / pnpm..."
if ! corepack enable 2>/dev/null; then
  echo "  corepack enable failed — falling back to npm i -g pnpm@9.15.0"
  npm install -g pnpm@9.15.0
fi
echo "  pnpm $(pnpm --version) OK"

# --- 3. Install dependencies ----------------------------------------------------
echo
echo "[3/6] Installing dependencies (pnpm install)..."
pnpm install

# --- 4. Environment file ----------------------------------------------------------
echo
echo "[4/6] Configuring .env..."
if [ -f .env ]; then
  echo "  .env already exists — leaving it untouched."
else
  cp .env.example .env
  echo "  Copied .env.example -> .env (edit secrets as needed)."
fi

# --- 5. Infra services --------------------------------------------------------------
echo
echo "[5/6] Starting infra (postgres, redis, minio, meilisearch, mailpit)..."
docker compose up -d

echo "  Waiting for PostgreSQL to become healthy..."
for i in $(seq 1 45); do
  if docker compose exec -T postgres pg_isready -U flowos >/dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 45 ]; then
    echo "ERROR: PostgreSQL did not become ready within 90s." >&2
    exit 1
  fi
  sleep 2
done
echo "  PostgreSQL OK"

# --- 6. Database -----------------------------------------------------------------------
echo
echo "[6/6] Prisma generate + migrate + seed..."
pnpm db:generate
pnpm db:migrate
pnpm db:seed

echo
echo "== Done =="
echo "Start developing with: pnpm dev"
echo "Web http://localhost:3000 | API http://localhost:4000 | Mailpit http://localhost:8025"
echo "Demo login: owner@acmebuild.demo / Demo1234! (tenant: acme-build)"
