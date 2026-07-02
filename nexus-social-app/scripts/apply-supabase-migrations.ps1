# Apply ordered Supabase CLI migrations via psql (when Supabase CLI is not linked).

#

# Usage:

#   npm run db:migrate:local -- -DatabaseUrl "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"

#   $env:DATABASE_URL = "postgresql://..." ; npm run db:migrate:local

#   npm run db:migrate:local   # uses DATABASE_URL from environment or .env.local

#

# Requires psql (PostgreSQL client) on PATH. Install via PostgreSQL or:

#   winget install PostgreSQL.PostgreSQL

#   choco install postgresql



param(

    [Parameter(Mandatory = $false)]

    [string]$DatabaseUrl = $env:DATABASE_URL

)



$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

$migrationsDir = Join-Path $root "supabase\migrations"



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



if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {

    $envLocal = Join-Path $root '.env.local'

    $DatabaseUrl = Get-DotEnvValue -FilePath $envLocal -Key 'DATABASE_URL'

}



if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {

    Write-Host 'Missing database connection string.' -ForegroundColor Red

    Write-Host ''

    Write-Host 'Provide one of:' -ForegroundColor Yellow

    Write-Host '  npm run db:migrate:local -- -DatabaseUrl "postgresql://postgres:PASSWORD@host:5432/postgres"'

    Write-Host '  $env:DATABASE_URL = "postgresql://..." ; npm run db:migrate:local'

    Write-Host '  Add DATABASE_URL=... to .env.local'

    Write-Host ''

    Write-Host 'For remote Supabase via CLI instead:' -ForegroundColor Yellow

    Write-Host '  npm run db:link'

    Write-Host '  npm run db:migrate'

    exit 1

}



if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {

    Write-Host 'psql is not on PATH.' -ForegroundColor Red

    Write-Host ''

    Write-Host 'Install the PostgreSQL client tools, then retry:' -ForegroundColor Yellow

    Write-Host '  winget install PostgreSQL.PostgreSQL'

    Write-Host '  choco install postgresql'

    Write-Host ''

    Write-Host 'Or use the Supabase CLI (no psql required):' -ForegroundColor Yellow

    Write-Host '  npm run db:link'

    Write-Host '  npm run db:migrate'

    exit 1

}



$files = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name



if ($files.Count -eq 0) {

    throw "No migration files found in supabase/migrations"

}



foreach ($file in $files) {

    Write-Host "Applying $($file.Name) ..."

    psql $DatabaseUrl -f $file.FullName

    if ($LASTEXITCODE -ne 0) {

        throw "Migration failed: $($file.Name)"

    }

}



Write-Host "All supabase/migrations applied successfully."

