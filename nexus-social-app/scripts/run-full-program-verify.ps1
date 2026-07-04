# Full program verification — Tier A (local automated)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/run-full-program-verify.ps1
# Optional: -IncludeLive  (runs Tier B if stack is up)

param(
  [switch]$IncludeLive
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "`n=== Nexus Program Verify (Tier A) ===" -ForegroundColor Cyan

$steps = @(
  @{ Name = 'typecheck'; Cmd = 'npm run typecheck' },
  @{ Name = 'test:unit'; Cmd = 'npm run test:unit' },
  @{ Name = 'test:integration'; Cmd = 'npm run test:integration' },
  @{ Name = 'schema:verify'; Cmd = 'npm run schema:verify' },
  @{ Name = 'schema:verify:004'; Cmd = 'npm run schema:verify:004' },
  @{ Name = 'uat:check-schema'; Cmd = 'npm run uat:check-schema' }
)

if ($IncludeLive) {
  $steps += @(
    @{ Name = 'verify:abm-seed'; Cmd = 'npm run verify:abm-seed' },
    @{ Name = 'uat:postman-ab'; Cmd = 'npm run uat:postman-ab' },
    @{ Name = 'test:live-integration'; Cmd = 'npm run test:live-integration' }
  )
}

$results = @()
foreach ($step in $steps) {
  Write-Host "`n--- $($step.Name) ---" -ForegroundColor Yellow
  & cmd /c $step.Cmd
  $ok = $LASTEXITCODE -eq 0
  $results += [PSCustomObject]@{ Gate = $step.Name; Pass = $ok }
  if ($ok) { Write-Host "[PASS] $($step.Name)" -ForegroundColor Green }
  else { Write-Host "[FAIL] $($step.Name)" -ForegroundColor Red }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize

Write-Host @"

Tier C–F (manual / gated): see specs/000-nexus-program/TEST-PLAN.md
Sprint 6 Pit Crew: blocked until Client #1 payment (reply Sprint 6 Ready).

"@

if ($results | Where-Object { -not $_.Pass }) { exit 1 }
exit 0
