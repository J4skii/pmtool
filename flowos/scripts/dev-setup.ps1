# FlowOS local dev setup (Windows / PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\dev-setup.ps1
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "== FlowOS dev setup ==" -ForegroundColor Cyan

# --- 1. Check prerequisites -------------------------------------------------
Write-Host "`n[1/6] Checking prerequisites..." -ForegroundColor Yellow

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Error "Node.js not found. Install Node 20+ from https://nodejs.org and re-run."
}
$nodeMajor = [int]((node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 20) {
    Write-Error "Node 20+ required (found $(node --version))."
}
Write-Host "  Node $(node --version) OK"

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Warning "Docker not found. Install Docker Desktop, or see the 'No Docker?' fallback in README.md."
    Write-Error "Docker is required for the default setup."
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker daemon is not running. Start Docker Desktop and re-run."
}
Write-Host "  Docker OK"

# --- 2. pnpm via corepack ----------------------------------------------------
Write-Host "`n[2/6] Enabling corepack / pnpm..." -ForegroundColor Yellow
corepack enable
if ($LASTEXITCODE -ne 0) {
    Write-Warning "corepack enable failed (try an elevated terminal). Falling back to npm i -g pnpm."
    npm install -g pnpm@9.15.0
}
Write-Host "  pnpm $(pnpm --version) OK"

# --- 3. Install dependencies --------------------------------------------------
Write-Host "`n[3/6] Installing dependencies (pnpm install)..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) { Write-Error "pnpm install failed." }

# --- 4. Environment file ------------------------------------------------------
Write-Host "`n[4/6] Configuring .env..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "  .env already exists — leaving it untouched."
} else {
    Copy-Item ".env.example" ".env"
    Write-Host "  Copied .env.example -> .env (edit secrets as needed)."
}

# --- 5. Infra services ---------------------------------------------------------
Write-Host "`n[5/6] Starting infra (postgres, redis, minio, meilisearch, mailpit)..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) { Write-Error "docker compose up failed." }

Write-Host "  Waiting for PostgreSQL to become healthy..."
$deadline = (Get-Date).AddSeconds(90)
while ($true) {
    docker compose exec -T postgres pg_isready -U flowos *> $null
    if ($LASTEXITCODE -eq 0) { break }
    if ((Get-Date) -gt $deadline) { Write-Error "PostgreSQL did not become ready within 90s." }
    Start-Sleep -Seconds 2
}
Write-Host "  PostgreSQL OK"

# --- 6. Database ----------------------------------------------------------------
Write-Host "`n[6/6] Prisma generate + migrate + seed..." -ForegroundColor Yellow
pnpm db:generate
if ($LASTEXITCODE -ne 0) { Write-Error "prisma generate failed." }
pnpm db:migrate
if ($LASTEXITCODE -ne 0) { Write-Error "prisma migrate failed." }
pnpm db:seed
if ($LASTEXITCODE -ne 0) { Write-Error "seed failed." }

Write-Host "`n== Done ==" -ForegroundColor Green
Write-Host "Start developing with: pnpm dev"
Write-Host "Web http://localhost:3000 | API http://localhost:4000 | Mailpit http://localhost:8025"
Write-Host "Demo login: owner@acmebuild.demo / Demo1234! (tenant: acme-build)"
