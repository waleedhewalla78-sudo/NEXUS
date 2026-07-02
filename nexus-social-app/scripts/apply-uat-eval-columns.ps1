# Apply evaluation column DDL for UAT (requires DATABASE_URL in .env.local or env).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$sqlFile = Join-Path $root 'supabase\migrations\RUN_IN_SQL_EDITOR_UAT_EVAL_COLUMNS.sql'

function Get-DotEnvValue([string]$FilePath, [string]$Key) {
    if (-not (Test-Path $FilePath)) { return $null }
    foreach ($line in Get-Content $FilePath) {
        $t = $line.Trim()
        if (-not $t -or $t.StartsWith('#')) { continue }
        $eq = $t.IndexOf('=')
        if ($eq -le 0) { continue }
        if ($t.Substring(0, $eq).Trim() -ne $Key) { continue }
        return $t.Substring($eq + 1).Trim().Trim('"').Trim("'")
    }
    return $null
}

$url = $env:DATABASE_URL
if ([string]::IsNullOrWhiteSpace($url)) {
    $url = Get-DotEnvValue -FilePath (Join-Path $root '.env.local') -Key 'DATABASE_URL'
}

if ([string]::IsNullOrWhiteSpace($url)) {
    Write-Host 'Missing DATABASE_URL — paste SQL manually in Supabase SQL Editor:' -ForegroundColor Yellow
    Write-Host "  $sqlFile"
    exit 1
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host 'psql not on PATH — paste SQL manually in Supabase SQL Editor.' -ForegroundColor Yellow
    exit 2
}

Write-Host "Applying $sqlFile ..."
& psql $url -f $sqlFile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Evaluation columns applied.' -ForegroundColor Green
