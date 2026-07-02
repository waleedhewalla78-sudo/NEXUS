#Requires -Version 5.1
<#
.SYNOPSIS
    Feature 004 (Nexus Social AI CMO) — DevOps closure script.

.DESCRIPTION
    Closes audit gaps DEP-01, DEP-02, DEP-03, and TEST-01:
      - Installs runtime npm dependencies (inngest, langfuse, @qdrant/js-client-rest)
      - Runs the Feature 004 unit test suite
      - Guides manual Supabase migration + Inngest sync with confirmation pauses

    Idempotent: safe to re-run. npm install is additive; tests are read-only.

.NOTES
    Run from repo root or any path — script resolves nexus-social-app automatically.
    Author: Feature 004 DevOps handoff
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Fatal {
    param([string]$Message)
    Write-Host "[FATAL] $Message" -ForegroundColor Red
    exit 1
}

function Write-Box {
    param(
        [string[]]$Lines,
        [string]$Title = 'ACTION REQUIRED'
    )
    $width = 72
    $border = ('=' * $width)
    Write-Host ""
    Write-Host $border -ForegroundColor Yellow
    Write-Host "  $Title" -ForegroundColor Yellow
    Write-Host $border -ForegroundColor Yellow
    foreach ($line in $Lines) {
        Write-Host "  $line" -ForegroundColor White
    }
    Write-Host $border -ForegroundColor Yellow
    Write-Host ""
}

function Invoke-ExternalCommand {
    param(
        [string]$Label,
        [string]$FilePath,
        [string[]]$ArgumentList
    )
    Write-Step $Label
    Write-Host "    $FilePath $($ArgumentList -join ' ')" -ForegroundColor DarkGray

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $psi.Arguments = ($ArgumentList -join ' ')
    $psi.WorkingDirectory = $script:AppRoot
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true

    $process = [System.Diagnostics.Process]::Start($psi)
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    if ($stdout.Trim()) { Write-Host $stdout }
    if ($stderr.Trim()) { Write-Host $stderr -ForegroundColor DarkYellow }

    return [PSCustomObject]@{
        ExitCode = $process.ExitCode
        StdOut   = $stdout
        StdErr   = $stderr
    }
}

function Resolve-NexusSocialAppRoot {
    $here = $PSScriptRoot
    if (-not $here) { $here = Get-Location | Select-Object -ExpandProperty Path }

    # Script lives in nexus-social-app/scripts/
    $candidate = Split-Path -Parent $here
    if ((Split-Path -Leaf $candidate) -eq 'nexus-social-app' -and (Test-Path (Join-Path $candidate 'package.json'))) {
        return (Resolve-Path $candidate).Path
    }

    # Fallback: cwd is nexus-social-app
    $cwd = (Get-Location).Path
    if ((Split-Path -Leaf $cwd) -eq 'nexus-social-app' -and (Test-Path (Join-Path $cwd 'package.json'))) {
        return (Resolve-Path $cwd).Path
    }

    # Fallback: cwd is monorepo root
    $nested = Join-Path $cwd 'nexus-social-app'
    if (Test-Path (Join-Path $nested 'package.json')) {
        return (Resolve-Path $nested).Path
    }

    return $null
}

# =============================================================================
# Step 1: Pre-Flight Safety Checks
# =============================================================================

Write-Host ""
Write-Host "Feature 004 — DevOps Closure (DEP-01 / DEP-02 / DEP-03 / TEST-01)" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green

Write-Step "Step 1: Pre-flight safety checks"

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Fatal "Node.js is not installed or not on PATH. Install Node.js 18+ from https://nodejs.org/ and re-run."
}
Write-Success "node found: $($nodeCmd.Source) ($(node --version))"

$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    Write-Fatal "npm is not installed or not on PATH. Install Node.js (includes npm) and re-run."
}
Write-Success "npm found: $($npmCmd.Source) ($(npm --version))"

$script:AppRoot = Resolve-NexusSocialAppRoot
if (-not $script:AppRoot) {
    Write-Fatal "Could not locate nexus-social-app directory. Run this script from the repo or place it in nexus-social-app/scripts/."
}
Write-Success "Working directory: $script:AppRoot"

if (-not (Test-Path (Join-Path $script:AppRoot 'package.json'))) {
    Write-Fatal "package.json not found in $script:AppRoot"
}

Write-Warn "Ensure you have a recent database backup before running SQL migrations."
Write-Host "       Supabase: Dashboard -> Database -> Backups (or pg_dump) before proceeding." -ForegroundColor Yellow

# =============================================================================
# Step 2: Dependency Installation (DEP-01)
# =============================================================================

Write-Step "Step 2: Dependency installation (closes DEP-01)"

$installResult = Invoke-ExternalCommand `
    -Label 'Installing inngest, langfuse, @qdrant/js-client-rest' `
    -FilePath 'npm' `
    -ArgumentList @('install', 'inngest', 'langfuse', '@qdrant/js-client-rest')

if ($installResult.ExitCode -ne 0) {
    Write-Fatal "npm install failed with exit code $($installResult.ExitCode). Fix dependency errors and re-run."
}
Write-Success "npm install completed successfully (DEP-01 closed)."

# =============================================================================
# Step 3: Test Execution (TEST-01)
# =============================================================================

Write-Step "Step 3: Test execution (closes TEST-01)"

$testResult = Invoke-ExternalCommand `
    -Label 'Running Feature 004 unit tests' `
    -FilePath 'npm' `
    -ArgumentList @(
        'test', '--', '--run',
        'src/lib/ai-cmo',
        'src/lib/governance',
        'src/lib/orchestration',
        'src/lib/finops',
        'src/lib/resilience'
    )

if ($testResult.ExitCode -ne 0) {
    Write-Host ""
    Write-Warn "TESTS FAILED. Do not proceed to Inngest sync or DB migrations until tests pass."
    exit 1
}

Write-Success "All Feature 004 tests passed (TEST-01 closed)."

# =============================================================================
# Step 4: Database Migration Instructions (DEP-03)
# =============================================================================

Write-Step "Step 4: Database migration (closes DEP-03 — manual Supabase step)"

$migrationPath = Join-Path $script:AppRoot 'supabase\migrations\RUN_IN_SQL_EDITOR_004_FINAL.sql'
if (-not (Test-Path $migrationPath)) {
    Write-Warn "Migration file not found at: $migrationPath"
    Write-Warn "Use supabase/migrations/20260624_000013 + 000014 if the combined file is missing."
}
else {
    Write-Success "Migration file found: supabase/migrations/RUN_IN_SQL_EDITOR_004_FINAL.sql"
}

Write-Box -Title 'DATABASE MIGRATION — DEP-03' -Lines @(
    'PREREQUISITE: 20260624_000012_ai_cmo_foundation.sql must already be applied.'
    ''
    '1. Open Supabase Dashboard -> SQL Editor for your project.'
    '2. Paste and execute the contents of:'
    '     supabase/migrations/RUN_IN_SQL_EDITOR_004_FINAL.sql'
    '3. Verify the RPC exists (run in SQL Editor):'
    '     SELECT proname FROM pg_proc WHERE proname = ''refresh_ai_cmo_materialized_views'';'
    '   Expected: one row returned.'
    '4. Optional — confirm ai_cmo tables exist:'
    '     SELECT table_name FROM information_schema.tables'
    '     WHERE table_schema = ''public'' AND table_name LIKE ''ai_cmo_%'' ORDER BY 1;'
)

Read-Host "Press ENTER after you have completed the Supabase migration and verified the RPC"

Write-Success "Database migration confirmed by operator (DEP-03 closed)."

# =============================================================================
# Step 5: Inngest Sync Instructions (DEP-02)
# =============================================================================

Write-Step "Step 5: Inngest sync (closes DEP-02 — manual dashboard step)"

Write-Box -Title 'INNGEST SYNC — DEP-02' -Lines @(
    '1. Deploy the Next.js app to Vercel (or ensure preview/prod URL is live).'
    '2. Open https://app.inngest.com and create/select app: nexus-ai-cmo'
    '3. Set environment variables on Vercel:'
    '     INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY'
    '4. In Inngest Dashboard -> Apps -> Sync -> point to:'
    '     https://<your-domain>/api/inngest'
    '5. Verify these 4 functions show as Registered:'
    '     - campaign-workflow'
    '     - trigger-replan'
    '     - outcome-ingestion  (cron: 0 2 * * *)'
    '     - mv-refresh         (cron: 0 * * * *)'
    ''
    'Reference: nexus-social-app/docs/004-PRODUCTION-READINESS.md'
)

Read-Host "Press ENTER after Inngest sync is complete and all 4 functions are Registered"

Write-Success "Inngest sync confirmed by operator (DEP-02 closed)."

# =============================================================================
# Step 6: Final Success Message
# =============================================================================

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "  Feature 004 local environment is PRODUCTION-READY." -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host ""
Write-Success "Closed: DEP-01 (npm deps), TEST-01 (unit tests), DEP-03 (migrations), DEP-02 (Inngest)"
Write-Host ""
Write-Warn "Remaining manual tasks (post-closure):"
Write-Host "  INT-01  Wire redis-to-inngest bridge to marketing event worker" -ForegroundColor Yellow
Write-Host "          (src/lib/orchestration/bridge/redis-to-inngest.ts)" -ForegroundColor DarkGray
Write-Host "  UAT-01  Live end-to-end campaign test (Dify publish + approval flow)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Full checklist: docs/004-PRODUCTION-READINESS.md" -ForegroundColor Cyan
Write-Host "  Authoritative spec: specs/004-ai-cmo-enterprise/spec.md" -ForegroundColor Cyan
Write-Host ""
