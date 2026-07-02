# T053 — Phase 1 UAT: OAuth → schedule → live publish
# Operator script for Feature 003 launch gate (referenced from 004 cross-track).
# Prerequisites: sandbox OAuth credentials in .env.local, worker running, dev server on port 3005.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot/..

Write-Host "=== T053 Phase 1 UAT — OAuth → schedule → publish ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 0: Baseline checks"
npm run typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run schema:verify
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Step 1: Start services (run in separate terminals if not already running):"
Write-Host "  Terminal A: npm run dev"
Write-Host "  Terminal B: npm run worker:dev"
Write-Host ""

Write-Host "Step 2: OAuth connect"
Write-Host "  Open http://localhost:3005/settings/integrations"
Write-Host "  Connect LinkedIn or X via OAuth (Meta requires App Review — T057)"
Write-Host ""

Write-Host "Step 3: Schedule publish"
Write-Host "  Create a post scheduled 2 minutes ahead with connected platform"
Write-Host ""

Write-Host "Step 4: Verify publish"
Write-Host "  Wait for worker publish loop (PUBLISH_INTERVAL_MS, default 60s)"
Write-Host "  Confirm post status = published + external_post_id (or failed with reason)"
Write-Host ""

Write-Host "Step 5: Record result in LAUNCH_CHECKLIST.md section 8 (T053)"
Write-Host "  PASS: published with external_post_id"
Write-Host "  FAIL: capture publish_error from posts table"
Write-Host ""

Write-Host "Optional automated smoke (no OAuth): npx playwright test e2e/smoke.spec.ts"
