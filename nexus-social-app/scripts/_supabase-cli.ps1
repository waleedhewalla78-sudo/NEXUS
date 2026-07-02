# Shared helpers for Supabase CLI npm scripts (dot-sourced by db-*.ps1).

$script:NexusDefaultProjectRef = 'lnlzxaqockpjezxskmnb'

function Get-NexusProjectRoot {
    Split-Path -Parent $PSScriptRoot
}

function Get-DotEnvValue {
    param(
        [string]$FilePath,
        [string]$Key
    )

    if (-not (Test-Path $FilePath)) {
        return $null
    }

    foreach ($line in Get-Content $FilePath) {
        if ($line -match '^\s*#' -or $line -match '^\s*$') {
            continue
        }
        if ($line -match "^\s*$([regex]::Escape($Key))\s*=\s*(.+?)\s*$") {
            $val = $Matches[1].Trim()
            if ($val.Length -ge 2) {
                $quote = $val[0]
                if (($quote -eq '"' -or $quote -eq "'") -and $val[-1] -eq $quote) {
                    $val = $val.Substring(1, $val.Length - 2)
                }
            }
            return $val
        }
    }

    return $null
}

function Get-SupabaseProjectRef {
    if (-not [string]::IsNullOrWhiteSpace($env:SUPABASE_PROJECT_REF)) {
        return $env:SUPABASE_PROJECT_REF.Trim()
    }

    $root = Get-NexusProjectRoot
    $envLocal = Join-Path $root '.env.local'
    $url = Get-DotEnvValue -FilePath $envLocal -Key 'NEXT_PUBLIC_SUPABASE_URL'
    if ($url -match 'https://([^.]+)\.supabase\.co') {
        return $Matches[1]
    }

    return $script:NexusDefaultProjectRef
}

function Test-SupabaseLinked {
    $root = Get-NexusProjectRoot
    $candidates = @(
        (Join-Path $root 'supabase\.temp\project-ref'),
        (Join-Path $root '.supabase\project-ref')
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) {
            return $true
        }
    }
    return $false
}

function Write-SupabaseLinkInstructions {
    param(
        [string]$ProjectRef
    )

    Write-Host ''
    Write-Host 'Supabase project is not linked.' -ForegroundColor Red
    Write-Host ''
    Write-Host 'Link once (requires Supabase login + database password):' -ForegroundColor Yellow
    Write-Host "  npm run db:link"
    Write-Host '  # or:'
    Write-Host "  npx supabase@latest link --project-ref $ProjectRef"
    Write-Host ''
    Write-Host 'Project ref (from .env.local or repo default):' -ForegroundColor Yellow
    Write-Host "  $ProjectRef"
    Write-Host ''
    Write-Host 'Dashboard:' -ForegroundColor Yellow
    Write-Host "  https://supabase.com/dashboard/project/$ProjectRef"
    Write-Host ''
    Write-Host 'Without the CLI, apply migrations manually:' -ForegroundColor Yellow
    Write-Host '  npm run db:migrate:local -- -DatabaseUrl "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"'
    Write-Host '  # or set $env:DATABASE_URL and run: npm run db:migrate:local'
    Write-Host ''
}

function Invoke-NpxSupabase {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$SupabaseArgs
    )

    $root = Get-NexusProjectRoot
    Push-Location $root
    try {
        $lines = & npx --yes supabase@latest @SupabaseArgs 2>&1
        return @{
            ExitCode = $LASTEXITCODE
            Output = ($lines | Out-String)
        }
    } finally {
        Pop-Location
    }
}

function Test-SupabaseLinkError {
    param(
        [string]$Output
    )

    return $Output -match '(?i)(not linked|cannot find project ref|project not found|link your project|run supabase link)'
}
