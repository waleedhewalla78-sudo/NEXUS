# Production pre-flight validation gate
# Usage: powershell -ExecutionPolicy Bypass -File scripts/preflight-production.ps1

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'dev-port.ps1')
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "=== Nexus Social Production Pre-flight ===" -ForegroundColor Cyan
Write-Host "Working directory: $root`n"

$failed = @()

function Test-Step {
    param([string]$Name, [scriptblock]$Action)
    Write-Host "[*] $Name..." -ForegroundColor Yellow
    try {
        & $Action
        if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
            throw "Exit code $LASTEXITCODE"
        }
        Write-Host "    PASS" -ForegroundColor Green
    } catch {
        Write-Host "    FAIL: $_" -ForegroundColor Red
        $script:failed += $Name
    }
}

# Placeholder env for production build (runtime uses real .env)
$buildEnv = @{
    NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'
    NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder-anon-key'
    SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-key'
    DIFY_API_KEY = 'placeholder-dify'
    INTERNAL_TOOL_SECRET = 'preflight-internal-secret-min-32-chars-long'
    REDIS_URL = 'redis://localhost:6379'
    CHATWOOT_WEBHOOK_SECRET = 'preflight-webhook-secret'
    APPROVAL_HMAC_SECRET = 'preflight-approval-hmac-secret-min-32'
    STRIPE_SECRET_KEY = 'sk_test_preflight'
    STRIPE_WEBHOOK_SECRET = 'whsec_preflight'
}

Test-Step "TypeScript" { npm run typecheck }
Test-Step "Unit tests (Vitest)" { npm run test }

Test-Step "Production build" {
    $saved = @{}
    foreach ($kv in $buildEnv.GetEnumerator()) {
        $saved[$kv.Key] = (Get-Item -Path "env:$($kv.Key)" -ErrorAction SilentlyContinue).Value
        Set-Item -Path "env:$($kv.Key)" -Value $kv.Value
    }
    try {
        npm run build
    } finally {
        foreach ($kv in $buildEnv.GetEnumerator()) {
            if ($null -ne $saved[$kv.Key]) {
                Set-Item -Path "env:$($kv.Key)" -Value $saved[$kv.Key]
            } else {
                Remove-Item -Path "env:$($kv.Key)" -ErrorAction SilentlyContinue
            }
        }
    }
}

Test-Step "Schema verification" {
    npm run schema:verify
}

Test-Step "Playwright smoke" {
    npx playwright test e2e/smoke.spec.ts
}

Test-Step "Health API (requires dev server on :$DevPort)" {
    $health = Invoke-RestMethod -Uri "$DevUrl/api/health" -TimeoutSec 10
    if ($health.status -ne 'ok') { throw "status=$($health.status)" }
    if ($health.details.db -ne 'up') { throw "db=$($health.details.db)" }
}

Write-Host ""
if ($failed.Count -eq 0) {
    Write-Host "=== PRE-FLIGHT PASSED — ready for production deploy ===" -ForegroundColor Green
    exit 0
}

Write-Host "=== PRE-FLIGHT FAILED ($($failed.Count) steps) ===" -ForegroundColor Red
$failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
Write-Host "`nSee DEPLOYMENT.md for remediation." -ForegroundColor Yellow
exit 1
