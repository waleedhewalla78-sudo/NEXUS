# Prepare full local walkthrough: Redis, dev server, worker, sample data, verification.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/prepare-walkthrough.ps1

param(
  [switch]$SkipProdStop,
  [switch]$SkipSeed,
  [switch]$SkipVerify
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'dev-port.ps1')
Set-Location $root
$devUrl = $DevUrl

Write-Host '=== Nexus Social - Prepare Full Walkthrough ===' -ForegroundColor Cyan

# 1. Redis
Write-Host "`n[1/7] Starting Redis..." -ForegroundColor Yellow
docker compose -f docker-compose.redis.yml up -d
Start-Sleep -Seconds 3
$redisPing = docker exec nexus-social-app-redis-1 redis-cli ping 2>$null
Write-Host "  Redis: $redisPing"

# 2. Free port 3000 from stale prod container (unhealthy image blocks dev)
if (-not $SkipProdStop) {
  Write-Host "`n[2/7] Stopping prod containers on port 3000..." -ForegroundColor Yellow
  docker stop nexus-social-app nexus-social-app-worker-1 2>$null | Out-Null
  Start-Sleep -Seconds 2
} else {
  Write-Host "`n[2/7] Skipping prod container stop (-SkipProdStop)" -ForegroundColor DarkYellow
}

# 3. Start dev server if not responding
Write-Host "`n[3/7] Ensuring Next.js dev server..." -ForegroundColor Yellow
function Test-DevReady([string]$url) {
  try {
    $r = Invoke-WebRequest -Uri "$url/api/health" -UseBasicParsing -TimeoutSec 30
    return ($r.StatusCode -eq 200 -or $r.StatusCode -eq 503)
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 503) {
      return $true
    }
    return $false
  }
}

if (-not (Test-DevReady $devUrl)) {
  Write-Host '  Starting npm run dev in background...'
  Start-Process powershell -ArgumentList '-NoProfile', '-Command', "Set-Location '$root'; npm run dev" -WindowStyle Minimized
  $deadline = (Get-Date).AddMinutes(3)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 5
    if (Test-DevReady $devUrl) { $devUp = $true; break }
  }
}
if (-not (Test-DevReady $devUrl)) { throw "Dev server did not become ready on port $DevPort within 3 minutes" }
Write-Host "  Dev server ready at $devUrl"

# 4. Warm webhook route
Write-Host "`n[4/7] Warming AI webhook route..." -ForegroundColor Yellow
$body = '{"event":"message_created","message":{"message_type":0,"sender":{"id":999}},"conversation":{"id":1001,"inbox_id":1}}'
try {
  $warm = Invoke-RestMethod -Uri "$devUrl/api/webhooks/chatwoot-ai" -Method POST `
    -ContentType 'application/json' -Headers @{ 'x-e2e-test' = 'true' } -Body $body -TimeoutSec 180
  Write-Host "  Warmup response: $($warm.reason)"
} catch {
  Write-Host "  Warmup warning: $_" -ForegroundColor DarkYellow
}

# 5. Start local AI worker
Write-Host "`n[5/7] Starting local AI worker..." -ForegroundColor Yellow
$workerRunning = Get-Process -Name node -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like '*worker*' }
if (-not $workerRunning) {
  Start-Process powershell -ArgumentList '-NoProfile', '-Command', "Set-Location '$root'; npm run worker:dev" -WindowStyle Minimized
  Start-Sleep -Seconds 3
  Write-Host '  Worker started in background (npm run worker:dev)'
} else {
  Write-Host '  Worker process already running'
}

# 6. Seed sample data
if (-not $SkipSeed) {
  Write-Host "`n[6/7] Seeding walkthrough sample data..." -ForegroundColor Yellow
  npx ts-node scripts/seed-walkthrough-data.ts
  if ($LASTEXITCODE -ne 0) {
    Write-Host '  Seed failed — apply migrations first (scripts/apply-migrations.ps1) and set Supabase keys' -ForegroundColor DarkYellow
  }
} else {
  Write-Host "`n[6/7] Skipping seed (-SkipSeed)" -ForegroundColor DarkYellow
}

# 7. Verification
if (-not $SkipVerify) {
  Write-Host "`n[7/7] Running verification..." -ForegroundColor Yellow
  $env:NEXT_PUBLIC_APP_URL = $devUrl
  npm run walkthrough
} else {
  Write-Host "`n[7/7] Skipping verify (-SkipVerify)" -ForegroundColor DarkYellow
}

Write-Host "`n=== Ready for manual walkthrough ===" -ForegroundColor Green
Write-Host "  App:       $devUrl"
Write-Host "  Login:     $devUrl/login"
Write-Host "  Calendar:  $devUrl/calendar"
Write-Host "  Analytics: $devUrl/analytics"
Write-Host "  AI Agent:  $devUrl/settings/ai-agent"
Write-Host "  Workspace: 11111111-1111-1111-1111-111111111111 (walkthrough-demo)"
