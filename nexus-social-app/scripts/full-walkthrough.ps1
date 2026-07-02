# Full local walkthrough: infrastructure, verification, E2E
# Usage: powershell -ExecutionPolicy Bypass -File scripts/full-walkthrough.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'dev-port.ps1')
Set-Location $root

Write-Host '=== Nexus Social - Full Walkthrough ===' -ForegroundColor Cyan

# 1. Infrastructure (best-effort when Docker is available)
Write-Host "`n[1/6] Starting stack..." -ForegroundColor Yellow
$repoRoot = Split-Path -Parent $root
$fullStackCompose = Join-Path $repoRoot 'docker-compose.full-stack.yml'
if ((Test-Path $fullStackCompose) -and (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host '  Using docker-compose.full-stack.yml (core: redis + web + worker)' -ForegroundColor DarkGray
  Push-Location $repoRoot
  try {
    docker compose --env-file .env.full-stack -f docker-compose.full-stack.yml up -d nexus-redis nexus-web nexus-worker 2>$null
    Start-Sleep -Seconds 5
  } catch {
    Write-Host '  Full-stack compose failed — falling back to local Redis' -ForegroundColor DarkYellow
    Set-Location $root
    docker compose -f docker-compose.redis.yml up -d 2>$null
  } finally {
    Pop-Location
  }
} else {
  try {
    docker compose -f docker-compose.redis.yml up -d 2>$null
    Start-Sleep -Seconds 2
  } catch {
    Write-Host '  Docker unavailable - ensure REDIS_URL points to a running Redis instance' -ForegroundColor DarkYellow
  }
}

# 2. Unit + integration tests + typecheck
Write-Host "`n[2/6] Running unit tests..." -ForegroundColor Yellow
npm run test:unit
if ($LASTEXITCODE -ne 0) { throw 'Unit tests failed' }

Write-Host "`n[2b/6] Running integration tests..." -ForegroundColor Yellow
npm run test:integration
if ($LASTEXITCODE -ne 0) { throw 'Integration tests failed' }

Write-Host "`n[3/6] Running TypeScript check..." -ForegroundColor Yellow
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Typecheck failed' }

# 3. Resolve dev server URL
$devUrl = $DevUrl
$healthPath = '/api/health'

function Test-DevServer([string]$url) {
  try {
    $r = Invoke-WebRequest -Uri "$url$healthPath" -UseBasicParsing -TimeoutSec 60
    return $r.StatusCode -eq 200 -or $r.StatusCode -eq 503
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 503) {
      return $true
    }
    return (Test-WebhookFixture $url)
  }
}

function Test-WebhookFixture([string]$url) {
  try {
    $body = '{"event":"message_created","message":{"message_type":0,"sender":{"id":999}},"conversation":{"id":1001,"inbox_id":1}}'
    $r = Invoke-RestMethod -Uri "$url/api/webhooks/chatwoot-ai" -Method POST `
      -ContentType 'application/json' -Headers @{ 'x-e2e-test' = 'true' } `
      -Body $body -TimeoutSec 120
    return $r.reason -eq 'global_kill_switch_active'
  } catch {
    return $false
  }
}

Write-Host "`n[4/6] Detecting dev server..." -ForegroundColor Yellow
if (-not (Test-DevServer $devUrl)) {
  Write-Host "  Port $DevPort not responding. Start the dev server in another terminal:" -ForegroundColor Red
  Write-Host '    npm run dev' -ForegroundColor White
  Write-Host '  Then re-run this script.' -ForegroundColor White
  exit 1
}
Write-Host "  Using dev server at $devUrl"

if (-not (Test-WebhookFixture $devUrl)) {
  Write-Host "  WARNING: E2E webhook fixture not active on $devUrl (restart dev server if code changed)" -ForegroundColor DarkYellow
}

# 4. E2E
Write-Host "`n[5/6] Running Playwright E2E..." -ForegroundColor Yellow
$env:NEXT_PUBLIC_APP_URL = $devUrl
npm run test:e2e
if ($LASTEXITCODE -ne 0) { throw 'E2E tests failed' }

# 5. Health check
Write-Host "`n[6/6] Health check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$devUrl$healthPath" -TimeoutSec 30
Write-Host "  Overall: $($health.details.overall)"

Write-Host "`n=== Walkthrough complete ===" -ForegroundColor Green
Write-Host "  App:    $devUrl"
Write-Host '  Redis:  localhost:6379 (or REDIS_URL from .env.local)'
Write-Host '  Worker: npm run worker:dev (separate terminal for AI replies)'
