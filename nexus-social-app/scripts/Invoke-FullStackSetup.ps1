#Requires -Version 5.1

<#

.SYNOPSIS

    Nexus Social V2.0 Full-Stack Bootstrap - merges V1.0 (Inngest/Redis/Supabase) with Enterprise GA (Qdrant/NextAuth/Embeddings).



.DESCRIPTION

    Idempotent local setup:

      1. Ensures .env.local from .env.full-stack.example

      2. npm install + V2.0 deps (openai, cheerio, next-auth, @playwright/test)

      3. Starts Redis + Qdrant via docker-compose.v2-local.yml

      4. Applies Supabase migrations 000012 -> 000015 (when DATABASE_URL/psql available)

      5. Verifies Qdrant health at /collections



.NOTES

    Run: powershell -ExecutionPolicy Bypass -File scripts/Invoke-FullStackSetup.ps1

    Or:  npm run bootstrap:local

#>



Set-StrictMode -Version Latest

$ErrorActionPreference = 'Stop'



function Write-Step { param([string]$Message) Write-Host "`n==> $Message" -ForegroundColor Cyan }

function Write-Ok   { param([string]$Message) Write-Host "[OK] $Message" -ForegroundColor Green }

function Write-Warn { param([string]$Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }

function Write-Err  { param([string]$Message) Write-Host "[ERR] $Message" -ForegroundColor Red; exit 1 }



function Resolve-AppRoot {

    $here = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

    $candidate = Split-Path -Parent $here

    if ((Split-Path -Leaf $candidate) -eq 'nexus-social-app') { return (Resolve-Path $candidate).Path }

    $cwd = (Get-Location).Path

    if ((Split-Path -Leaf $cwd) -eq 'nexus-social-app') { return (Resolve-Path $cwd).Path }

    $nested = Join-Path $cwd 'nexus-social-app'

    if (Test-Path (Join-Path $nested 'package.json')) { return (Resolve-Path $nested).Path }

    Write-Err 'Could not find nexus-social-app root. Run from repo or nexus-social-app/scripts/.'

}



function Get-DotEnvValue {

    param([string]$FilePath, [string]$Key)

    if (-not (Test-Path $FilePath)) { return $null }

    foreach ($line in Get-Content $FilePath) {

        if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }

        if ($line -match "^\s*$([regex]::Escape($Key))\s*=\s*(.+?)\s*$") {

            $val = $Matches[1].Trim()

            if ($val.Length -ge 2 -and $val[0] -eq $val[-1] -and ($val[0] -eq '"' -or $val[0] -eq "'")) {

                $val = $val.Substring(1, $val.Length - 2)

            }

            return $val

        }

    }

    return $null

}



function Test-DockerRunning {

    try {

        docker info 2>&1 | Out-Null

        return $LASTEXITCODE -eq 0

    } catch {

        return $false

    }

}



function Start-V2Infra {

    Write-Step 'Starting V2.0 infrastructure (Redis + Qdrant)'

    if (-not (Test-DockerRunning)) {

        Write-Warn 'Docker not running - skip Redis/Qdrant. Start Docker Desktop and re-run.'

        return

    }



    $composeFile = Join-Path $script:AppRoot 'docker-compose.v2-local.yml'

    docker compose -f $composeFile up -d

    if ($LASTEXITCODE -ne 0) {

        Write-Warn 'docker compose failed - trying legacy Qdrant container name...'

        $qdrantRunning = docker ps --filter 'name=nexus-qdrant' --filter 'status=running' -q

        if (-not $qdrantRunning) {

            docker run -d --name nexus-qdrant -p 6333:6333 -p 6334:6334 `

                -v nexus_qdrant_data:/qdrant/storage qdrant/qdrant:latest 2>$null

        }

        docker compose -f (Join-Path $script:AppRoot 'docker-compose.redis.yml') up -d 2>$null

    }



    Start-Sleep -Seconds 3

    Write-Ok 'Infrastructure containers started'

}



function Test-QdrantHealth {

    Write-Step 'Verifying Qdrant'

    $qdrantUrl = Get-DotEnvValue -FilePath (Join-Path $script:AppRoot '.env.local') -Key 'QDRANT_URL'

    if ([string]::IsNullOrWhiteSpace($qdrantUrl)) { $qdrantUrl = 'http://localhost:6333' }



    try {

        $response = Invoke-RestMethod -Uri "$qdrantUrl/collections" -Method Get -TimeoutSec 10

        $count = @($response.result.collections).Count

        Write-Ok "Qdrant alive at $qdrantUrl ($count collection(s))"

    } catch {

        Write-Warn "Qdrant not reachable at $qdrantUrl - $($_.Exception.Message)"

        Write-Host '  Ensure: docker compose -f docker-compose.v2-local.yml up -d' -ForegroundColor DarkGray

    }

}



function Install-V2Dependencies {

    Write-Step 'Installing npm dependencies (including V2.0 Enterprise GA packages)'

    Set-Location $script:AppRoot



    npm install --legacy-peer-deps

    if ($LASTEXITCODE -ne 0) { Write-Err 'npm install failed' }



    npm install openai cheerio next-auth @playwright/test --legacy-peer-deps

    if ($LASTEXITCODE -ne 0) { Write-Err 'V2.0 dependency install failed' }



    Write-Ok 'Dependencies installed (openai, cheerio, next-auth, @playwright/test + existing tree)'

}



function Ensure-EnvLocal {

    Write-Step 'Ensuring .env.local from V2.0 template'

    $example = Join-Path $script:AppRoot '.env.full-stack.example'

    $local = Join-Path $script:AppRoot '.env.local'



    if (-not (Test-Path $example)) {

        Write-Warn '.env.full-stack.example missing - using .env.example fallback'

        $example = Join-Path $script:AppRoot '.env.example'

    }



    if (-not (Test-Path $local)) {

        Copy-Item $example $local

        Write-Ok 'Created .env.local - edit Supabase keys, OPENROUTER_API_KEY, NEXTAUTH_SECRET'

    } else {

        Write-Ok '.env.local exists - not overwritten (merge new vars from .env.full-stack.example manually if needed)'

    }

}



function Get-OrderedMigrations {

    $migrationsDir = Join-Path $script:AppRoot 'supabase\migrations'

    $priority = @(

        '20260624_000012_ai_cmo_foundation.sql',

        '20260624_000013_ai_cmo_sprint14_draft.sql',

        '20260624_000014_agencies_hierarchy.sql',

        '20260626_000015_ai_cmo_enterprise_ga.sql'

    )



    $resolved = @()

    foreach ($name in $priority) {

        $path = Join-Path $migrationsDir $name

        if (Test-Path $path) {

            $resolved += $path

        } else {

            Write-Warn "Migration not found (skipped): $name"

        }

    }

    return $resolved

}



function Apply-V2Migrations {

    Write-Step 'Applying Supabase migrations 000012 -> 000015'



    $databaseUrl = $env:DATABASE_URL

    if ([string]::IsNullOrWhiteSpace($databaseUrl)) {

        $databaseUrl = Get-DotEnvValue -FilePath (Join-Path $script:AppRoot '.env.local') -Key 'DATABASE_URL'

    }



    if ([string]::IsNullOrWhiteSpace($databaseUrl)) {

        Write-Warn 'DATABASE_URL not set - skipping psql migrations.'

        Write-Host '  Option A: Add DATABASE_URL to .env.local and re-run bootstrap:local' -ForegroundColor Yellow

        Write-Host '  Option B: Paste supabase/migrations/20260626_000015_ai_cmo_enterprise_ga.sql in Supabase SQL Editor' -ForegroundColor Yellow

        Write-Host '  Option C: npm run db:migrate:local (applies ALL ordered migrations in supabase/migrations/)' -ForegroundColor Yellow

        return

    }



    if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {

        Write-Warn 'psql not on PATH - skipping automated migration.'

        Write-Host '  Install: winget install PostgreSQL.PostgreSQL' -ForegroundColor Yellow

        Write-Host '  Or run 000015 manually in Supabase SQL Editor.' -ForegroundColor Yellow

        return

    }



    $files = Get-OrderedMigrations

    if ($files.Count -eq 0) {

        Write-Warn 'No 000012-000015 migration files found'

        return

    }



    foreach ($file in $files) {

        $name = Split-Path -Leaf $file

        Write-Host "  Applying $name ..."

        psql $databaseUrl -v ON_ERROR_STOP=1 -f $file 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

        if ($LASTEXITCODE -ne 0) {

            Write-Warn "Migration may have partially applied (idempotent DDL): $name"

        } else {

            Write-Ok "Applied $name"

        }

    }

}



function Test-RedisPing {

    Write-Step 'Verifying Redis'

    if (Get-Command redis-cli -ErrorAction SilentlyContinue) {

        $pong = redis-cli ping 2>$null

        if ($pong -eq 'PONG') { Write-Ok 'Redis PONG' } else { Write-Warn "Redis: $pong" }

    } else {

        Write-Warn 'redis-cli not installed - assuming Docker Redis on :6379'

    }

}



# =============================================================================

# Main

# =============================================================================



$script:AppRoot = Resolve-AppRoot

Set-Location $script:AppRoot



Write-Host ''

Write-Host '================================================================' -ForegroundColor Magenta

Write-Host '  Nexus Social V2.0 Full-Stack Bootstrap (Enterprise GA)' -ForegroundColor Magenta

Write-Host '================================================================' -ForegroundColor Magenta



Ensure-EnvLocal

Install-V2Dependencies

Start-V2Infra

Test-RedisPing

Test-QdrantHealth

Apply-V2Migrations



Write-Step 'Bootstrap complete'

Write-Host @'



Next steps:

  1. Edit .env.local (Supabase keys, OPENROUTER_API_KEY, NEXTAUTH_SECRET)

  2. npm run verify:v2-stack

  3. Terminal A: npm run dev

  4. Terminal B: npm run worker:dev

  5. Terminal C: npx inngest-cli@latest dev -u http://localhost:3005/api/inngest



Full runbook: docs/FULL-STACK-LOCAL-SETUP.md



'@ -ForegroundColor White

