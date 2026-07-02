# Phase 4 UAT — Automated Validation Script
# Runs gates that do NOT require live OAuth sandbox credentials.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/phase4-uat.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host '=== Phase 4 UAT — Automated Gates ===' -ForegroundColor Cyan

$results = @()

function Test-Gate([string]$Name, [scriptblock]$Block) {
  Write-Host "`n[$Name]" -ForegroundColor Yellow
  try {
    & $Block
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) { throw "Exit code $LASTEXITCODE" }
    Write-Host "  PASS" -ForegroundColor Green
    $script:results += [PSCustomObject]@{ Gate = $Name; Status = 'PASS' }
  } catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
    $script:results += [PSCustomObject]@{ Gate = $Name; Status = 'FAIL' }
    throw
  }
}

Test-Gate 'T054 schema:verify (18/18)' {
  npm run schema:verify
}

Test-Gate 'Typecheck' {
  npm run typecheck
}

Test-Gate 'Unit tests (115+)' {
  npm run test:unit
}

Test-Gate 'Integration tests (incl. T053 sandbox)' {
  npm run test:integration
}

Test-Gate 'T053 sandbox publish UAT' {
  npm run uat:t053:sandbox
}

Test-Gate 'T057 meta gate (staging workspaces)' {
  npm run uat:meta-approve -- 11111111-1111-1111-1111-111111111111 --force
  npm run uat:meta-approve -- 87737e18-8882-4eea-a647-6c3eaa08cd25 --force
}

Test-Gate 'Publish E2E (T024)' {
  npx playwright test e2e/publish-flow.spec.ts e2e/publish-integration.spec.ts
}

Test-Gate 'Build' {
  npm run build
}

Write-Host "`n=== Phase 4 automated gates PASSED ===" -ForegroundColor Green
Write-Host "`nOptional operator steps (production only):" -ForegroundColor Yellow
Write-Host '  T053 live — add OAuth creds to .env.local, then: npm run uat:t053'
Write-Host '  T055 — After live publish, verify /analytics shows ingested metrics'
Write-Host '  T056 — Full docker walkthrough: npm run walkthrough'
Write-Host '  T057 prod — Meta App Review in developers.facebook.com before production IG/FB'

$results | Format-Table -AutoSize
