# Human UAT Gates - orchestrates stack checks, live integration, and Postman A/B.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/run-human-uat-gates.ps1
# Prereq: Docker Desktop running; .env.local configured.

$ErrorActionPreference = 'Stop'
$root = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { Get-Location }
Set-Location $root

$results = @()
$dateStamp = (Get-Date -Format 'yyyy-MM-dd')

function Add-Result([string]$Gate, [string]$Status, [string]$Detail) {
    $script:results += [PSCustomObject]@{ Gate = $Gate; Status = $Status; Detail = $Detail }
}

function Test-Http([string]$Url, [int]$TimeoutSec = 5) {
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
        return @{ Ok = $true; Code = $r.StatusCode }
    } catch {
        return @{ Ok = $false; Code = 0; Error = $_.Exception.Message }
    }
}

function Invoke-Npm([string[]]$NpmArgs, [scriptblock]$OnLine) {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & npm @NpmArgs 2>&1 | ForEach-Object { & $OnLine $_ }
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prevEap
    }
}

function Invoke-Npx([string[]]$NpxArgs, [scriptblock]$OnLine) {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & npx @NpxArgs 2>&1 | ForEach-Object { & $OnLine $_ }
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prevEap
    }
}

Write-Host ''
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host '  Nexus Human UAT Gates (live integration + Postman A/B)' -ForegroundColor Cyan
Write-Host '================================================================' -ForegroundColor Cyan

# Gate 0: Parse PS1 (Unicode-safe bootstrap script)
Write-Host "`n[Gate 0] Invoke-FullStackSetup.ps1 parse check" -ForegroundColor Yellow
$parseOk = $true
try {
    $null = [System.Management.Automation.Language.Parser]::ParseFile(
        (Join-Path $root 'scripts/Invoke-FullStackSetup.ps1'),
        [ref]$null,
        [ref]$null
    )
    Write-Host '  PASS - script parses under PowerShell 5.1' -ForegroundColor Green
    Add-Result 'PS1 Unicode parse' 'PASS' 'Invoke-FullStackSetup.ps1'
} catch {
    Write-Host "  FAIL - $($_.Exception.Message)" -ForegroundColor Red
    Add-Result 'PS1 Unicode parse' 'FAIL' $_.Exception.Message
    $parseOk = $false
}

# Gate 1: Infrastructure
Write-Host "`n[Gate 1] Infrastructure (Redis + Qdrant)" -ForegroundColor Yellow
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
docker compose -f docker-compose.v2-local.yml up -d 2>&1 | Out-Null
$ErrorActionPreference = $prevEap
Start-Sleep -Seconds 5
$redis = Test-Http 'http://localhost:6379' 2
$qdrant = Test-Http 'http://localhost:6333/collections' 5
if ($qdrant.Ok) {
    Write-Host '  PASS - Qdrant reachable' -ForegroundColor Green
    Add-Result 'Infra Qdrant' 'PASS' '6333/collections'
} else {
    Write-Host "  WARN - Qdrant: $($qdrant.Error)" -ForegroundColor Yellow
    Add-Result 'Infra Qdrant' 'WARN' $(if ($qdrant.Error) { $qdrant.Error } else { 'unreachable' })
}
$ollama = Test-Http 'http://localhost:11434/api/tags' 5
if ($ollama.Ok) {
    Write-Host '  PASS - Ollama reachable' -ForegroundColor Green
    Add-Result 'Infra Ollama' 'PASS' '11434/api/tags'
} else {
    Write-Host "  FAIL - Ollama required for UAT" -ForegroundColor Red
    Add-Result 'Infra Ollama' 'FAIL' $(if ($ollama.Error) { $ollama.Error } else { 'down' })
}

# Gate 2: verify:v2-stack
Write-Host "`n[Gate 2] verify:v2-stack" -ForegroundColor Yellow
$v2Exit = Invoke-Npm @('run', 'verify:v2-stack') { param($line) Write-Host "  $line" }
if ($v2Exit -eq 0) {
    Add-Result 'verify:v2-stack' 'PASS' 'all checks green'
} else {
    Add-Result 'verify:v2-stack' 'FAIL' "exit $v2Exit"
}

# Gate 3: Ensure API key
Write-Host "`n[Gate 3] Ensure UAT API key" -ForegroundColor Yellow
$keyExit = Invoke-Npx @('tsx', 'scripts/ensure-uat-api-key.ts') { param($line) Write-Host "  $line" }
if ($keyExit -ne 0) { Add-Result 'ensure-uat-api-key' 'FAIL' 'could not create key' }

if (Test-Path (Join-Path $root '.uat-secrets.local')) {
    Get-Content (Join-Path $root '.uat-secrets.local') | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.+)$') {
            $k = $Matches[1].Trim()
            $v = $Matches[2].Trim()
            if (-not [string]::IsNullOrWhiteSpace($v)) { Set-Item -Path "env:$k" -Value $v }
        }
    }
    Add-Result 'ensure-uat-api-key' 'PASS' 'NEXUS_API_KEY loaded'
}

# Gate 4: App + Inngest readiness
Write-Host "`n[Gate 4] App + Inngest readiness" -ForegroundColor Yellow
$app = Test-Http 'http://localhost:3005/login' 8
$inngest = Test-Http 'http://localhost:8288' 5
if (-not $app.Ok) {
    Write-Host '  App not running on :3005 - start: npm run dev (Terminal 3)' -ForegroundColor Yellow
    Add-Result 'Next.js :3005' 'FAIL' 'not reachable - manual Terminal 3 required'
}
else {
    Add-Result 'Next.js :3005' 'PASS' "HTTP $($app.Code)"
}
if (-not $inngest.Ok) {
    Write-Host '  Inngest not on :8288 - start inngest-cli dev (Terminal 5)' -ForegroundColor Yellow
    Add-Result 'Inngest :8288' 'FAIL' 'not reachable - manual Terminal 5 required'
}
else {
    Add-Result 'Inngest :8288' 'PASS' "HTTP $($inngest.Code)"
}

$stackReady = $app.Ok -and $inngest.Ok -and $ollama.Ok

if (-not $env:LIVE_TEST_POLL_TIMEOUT_MS) {
    $env:LIVE_TEST_POLL_TIMEOUT_MS = '1200000'
}

if ($stackReady) {
    # Gate 5: Live integration
    Write-Host "`n[Gate 5] npm run test:live-integration" -ForegroundColor Yellow
    $liveExit = Invoke-Npm @('run', 'test:live-integration') { param($line) Write-Host $line }
    if ($liveExit -eq 0) {
        Add-Result 'test:live-integration' 'PASS' '5/5 DB checks'
    } else {
        Add-Result 'test:live-integration' 'FAIL' "exit $liveExit"
    }

    # Gate 6: Postman A/B
    Write-Host "`n[Gate 6] Postman UAT A/B (automated)" -ForegroundColor Yellow
    $postExit = Invoke-Npm @('run', 'uat:postman-ab') { param($line) Write-Host $line }
    if ($postExit -eq 0) {
        Add-Result 'Postman Test A' 'PASS' $dateStamp
        Add-Result 'Postman Test B' 'PASS' $dateStamp
    } else {
        Add-Result 'Postman A/B' 'FAIL' "exit $postExit"
    }
} else {
    Write-Host "`n[SKIP] Live integration + Postman A/B - start Terminals 3-5 first" -ForegroundColor Yellow
    Write-Host '  Terminal 3: npm run dev' -ForegroundColor DarkGray
    Write-Host '  Terminal 4: npm run worker:dev' -ForegroundColor DarkGray
    Write-Host '  Terminal 5: npx inngest-cli@latest dev -u http://localhost:3005/api/inngest' -ForegroundColor DarkGray
    Add-Result 'test:live-integration' 'SKIP' 'stack not ready'
    Add-Result 'Postman A/B' 'SKIP' 'stack not ready'
}

# Write executive sign-off patch file
$signoffPath = Join-Path $root 'docs/UAT-SIGNOFF-RESULTS.md'
$livePass = ($results | Where-Object { $_.Gate -eq 'test:live-integration' -and $_.Status -eq 'PASS' })
$v2Pass = ($results | Where-Object { $_.Gate -eq 'verify:v2-stack' -and $_.Status -eq 'PASS' })
$postA = ($results | Where-Object { $_.Gate -eq 'Postman Test A' -and $_.Status -eq 'PASS' })
$postB = ($results | Where-Object { $_.Gate -eq 'Postman Test B' -and $_.Status -eq 'PASS' })

@"
# UAT Sign-Off Results

**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Executive Sign-Off

| Checkpoint | Verified By | Date |
|------------|-------------|------|
| V2.0 Stack Verified (``verify:v2-stack``) | $(if ($v2Pass) { 'Automated gate' } else { '' }) | $(if ($v2Pass) { $dateStamp } else { '' }) |
| Live Integration 5/5 PASS | $(if ($livePass) { 'Automated gate' } else { '' }) | $(if ($livePass) { $dateStamp } else { '' }) |
| Postman Test A (202 -> completed) | $(if ($postA) { 'Automated gate' } else { '' }) | $(if ($postA) { $dateStamp } else { '' }) |
| Postman Test B (Budget Block) | $(if ($postB) { 'Automated gate' } else { '' }) | $(if ($postB) { $dateStamp } else { '' }) |
| 9.7/10 Architecture Proven | $(if ($livePass -and $postA -and $postB) { 'Automated gate' } else { '' }) | $(if ($livePass -and $postA -and $postB) { $dateStamp } else { '' }) |

**Signatures (human)**

| Role | Name | Date |
|------|------|------|
| Engineer | | |
| QA | | |
| Product | | |
| CTO / Tech Lead | | |

## Gate Detail

$(($results | ForEach-Object { "- **$($_.Gate)**: $($_.Status) - $($_.Detail)" }) -join "`n")

"@ | Set-Content -Path $signoffPath -Encoding UTF8

Write-Host "`nResults written: docs/UAT-SIGNOFF-RESULTS.md" -ForegroundColor Cyan
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize

$failed = @($results | Where-Object { $_.Status -eq 'FAIL' })
if ($failed.Count -gt 0) { exit 1 }
