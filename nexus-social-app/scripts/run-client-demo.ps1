# End-to-end client demo verification (run before a live presentation)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/run-client-demo.ps1

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'dev-port.ps1')
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "=== Nexus Social Client Demo Verification ===" -ForegroundColor Cyan
Write-Host "App URL: $DevUrl`n"

$script:results = @()

function Test-Step {
  param([string]$Name, [scriptblock]$Action)
  Write-Host "[*] $Name..." -ForegroundColor Yellow
  try {
    & $Action
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) { throw "exit $LASTEXITCODE" }
    Write-Host "    PASS" -ForegroundColor Green
    $script:results += [pscustomobject]@{ Step = $Name; Status = 'PASS' }
  } catch {
    Write-Host "    FAIL: $_" -ForegroundColor Red
    $script:results += [pscustomobject]@{ Step = $Name; Status = 'FAIL'; Detail = "$_" }
  }
}

Test-Step 'Health API' {
  $h = Invoke-RestMethod -Uri "$DevUrl/api/health" -TimeoutSec 30
  if ($h.status -ne 'ok') { throw "status=$($h.status)" }
  Write-Host "    db=$($h.details.db) redis=$($h.details.redis) dify=$($h.details.dify)" -ForegroundColor DarkGray
}

Test-Step 'Schema tables' { npm run schema:verify | Out-Null }

Test-Step 'Unit tests (Vitest)' { npm run test | Out-Null }

Test-Step 'Playwright smoke' {
  $env:NEXT_PUBLIC_APP_URL = $DevUrl
  npx playwright test e2e/smoke.spec.ts
  if ($LASTEXITCODE -ne 0) { throw "playwright exit $LASTEXITCODE" }
}

Test-Step 'Seed walkthrough data' { npm run seed:walkthrough | Out-Null }

Test-Step 'AI webhook enqueue (E2E fixture)' {
  $body = '{"event":"message_created","message":{"message_type":0,"content":"Demo: Where is my order?","id":9001,"sender":{"id":999}},"conversation":{"id":9001,"inbox_id":1}}'
  $r = Invoke-RestMethod -Uri "$DevUrl/api/webhooks/chatwoot-ai" -Method POST `
    -ContentType 'application/json' -Headers @{ 'x-e2e-test' = 'true' } -Body $body -TimeoutSec 60
  if ($r.reason -ne 'global_kill_switch_active' -and $r.status -ne 'enqueued') {
    throw "unexpected response: $($r | ConvertTo-Json -Compress)"
  }
  Write-Host "    response: $($r | ConvertTo-Json -Compress)" -ForegroundColor DarkGray
}

Test-Step 'Login page reachable' {
  $code = (Invoke-WebRequest -Uri "$DevUrl/login" -UseBasicParsing -TimeoutSec 30).StatusCode
  if ($code -ne 200) { throw "HTTP $code" }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
$script:results | Format-Table -AutoSize
$failed = @($script:results | Where-Object { $_.Status -eq 'FAIL' }).Count
if ($failed -gt 0) {
  Write-Host "Demo verification: $failed step(s) failed - see CLIENT_DEMO.md troubleshooting." -ForegroundColor Red
  exit 1
}
Write-Host "Demo verification PASSED - ready for client walkthrough at $DevUrl" -ForegroundColor Green
