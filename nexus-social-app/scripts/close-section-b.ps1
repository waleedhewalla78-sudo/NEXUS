# Section B automated gate runner
# Usage: powershell -ExecutionPolicy Bypass -File scripts/close-section-b.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "`n=== Section B — Automated Gate Sequence ===" -ForegroundColor Cyan

$steps = @(
  @{ Name = 'verify:production:code'; Cmd = 'npm run verify:production:code' },
  @{ Name = 'verify:phase-d'; Cmd = 'npm run verify:phase-d' },
  @{ Name = 'test:integration'; Cmd = 'npm run test:integration' },
  @{ Name = 'test:e2e'; Cmd = 'npm run test:e2e' },
  @{ Name = 'load-test (k6 smoke)'; Cmd = 'npm run load-test' }
)

$results = @()
foreach ($step in $steps) {
  Write-Host "`n--- $($step.Name) ---" -ForegroundColor Yellow
  & cmd /c $step.Cmd
  $ok = $LASTEXITCODE -eq 0
  $results += [PSCustomObject]@{ Gate = $step.Name; Pass = $ok }
  if (-not $ok) {
    Write-Host "[FAIL] $($step.Name)" -ForegroundColor Red
  } else {
    Write-Host "[PASS] $($step.Name)" -ForegroundColor Green
  }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize

Write-Host @"

Human gates still required (see docs/SECTION-B-CLOSURE.md):
  B1 Meta App Review  → docs/OPS-META-APP-REVIEW.md
  B2 OAuth UAT        → docs/OPS-OAUTH-UAT-RUNBOOK.md
  B3 Exec sign-off    → docs/UAT-SIGNOFF-RESULTS.md
  B4 Prod secrets     → docs/OPS-PROD-SECRETS-CHECKLIST.md
  Phase D integration → docs/OPS-PHASE-D-INTEGRATION.md

"@

if ($results | Where-Object { -not $_.Pass }) { exit 1 }
exit 0
