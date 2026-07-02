# REL-STACK: Docker up + seed + demo verification (repo root)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/rel-stack.ps1

param(
  [switch]$SkipBuild,
  [switch]$SkipSeed,
  [switch]$SkipDemo
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$app = Join-Path $root 'nexus-social-app'
$devUrl = 'http://localhost:3005'

Write-Host '=== REL-STACK: Docker + Seed + Demo ===' -ForegroundColor Cyan

if (-not (Test-Path (Join-Path $root '.env.full-stack'))) {
  Copy-Item (Join-Path $root '.env.full-stack.example') (Join-Path $root '.env.full-stack')
  Write-Host 'Created .env.full-stack from example' -ForegroundColor DarkYellow
}

Push-Location $root
try {
  if (-not $SkipBuild) {
    Write-Host "`n[1/4] Starting core stack (redis + web + worker)..." -ForegroundColor Yellow
    docker compose --env-file .env.full-stack -f docker-compose.full-stack.yml up -d --build nexus-redis nexus-web nexus-worker
    if ($LASTEXITCODE -ne 0) { throw 'docker compose up failed' }
    Start-Sleep -Seconds 15
  } else {
    Write-Host "`n[1/4] Skipping build (-SkipBuild)" -ForegroundColor DarkYellow
  }

  Write-Host "`n[2/4] Waiting for app health..." -ForegroundColor Yellow
  $deadline = (Get-Date).AddMinutes(3)
  $healthOk = $false
  while ((Get-Date) -lt $deadline) {
    try {
      $h = Invoke-RestMethod -Uri "$devUrl/api/health" -TimeoutSec 30
      Write-Host "  status=$($h.status) db=$($h.details.db) redis=$($h.details.redis) overall=$($h.details.overall)"
      if ($h.details.db -eq 'up' -and $h.details.redis -eq 'up') { $healthOk = $true; break }
    } catch {
      Write-Host "  waiting..."
    }
    Start-Sleep -Seconds 10
  }
  if (-not $healthOk) {
    Write-Host '  WARN: health not fully green — check Supabase keys in nexus-social-app/.env.local' -ForegroundColor DarkYellow
  }

  if (-not $SkipSeed) {
    Write-Host "`n[3/4] Seeding walkthrough data..." -ForegroundColor Yellow
    docker run --rm `
      -v "${app}:/app" `
      -w /app `
      --env-file "$app/.env" `
      --env-file "$app/.env.local" `
      node:20-alpine `
      sh -c "npm ci --prefer-offline && npm run seed:walkthrough"
    if ($LASTEXITCODE -ne 0) { throw 'seed:walkthrough failed' }
  } else {
    Write-Host "`n[3/4] Skipping seed (-SkipSeed)" -ForegroundColor DarkYellow
  }

  if (-not $SkipDemo) {
    Write-Host "`n[4/4] Demo verification..." -ForegroundColor Yellow
    docker run --rm `
      -v "${app}:/app" `
      -w /app `
      --env-file "$app/.env" `
      --env-file "$app/.env.local" `
      -e "NEXT_PUBLIC_APP_URL=$devUrl" `
      -e "PLAYWRIGHT_BASE_URL=$devUrl" `
      --add-host=host.docker.internal:host-gateway `
      node:20-alpine `
      sh -c "npm ci --prefer-offline && npx playwright install chromium && npm run demo:verify"
    if ($LASTEXITCODE -ne 0) { throw 'demo:verify failed' }
  } else {
    Write-Host "`n[4/4] Skipping demo (-SkipDemo)" -ForegroundColor DarkYellow
  }

  Write-Host "`n=== REL-STACK complete ===" -ForegroundColor Green
  Write-Host "  App:   $devUrl"
  Write-Host "  Login: $devUrl/login  (demo@nexussocial.io / DemoWalk2026!)"
} finally {
  Pop-Location
}
