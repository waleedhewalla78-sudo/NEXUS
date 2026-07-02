# Apply all Nexus Social SQL migrations in documented order.
# Usage: .\scripts\apply-migrations.ps1 -DatabaseUrl "postgresql://..."

param(
    [Parameter(Mandatory = $true)]
    [string]$DatabaseUrl
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$files = @(
    "src/sql/phase1_setup.sql",
    "sprint8_schema.sql",
    "sprint8_custom_domains.sql",
    "sprint9_schema.sql",
    "sprint9_schema_part2.sql",
    "sprint10_schema.sql",
    "sprint11_schema.sql",
    "omnichannel_schema.sql",
    "reputation_schema.sql",
    "ai_schema.sql",
    "master_ai_schema.sql",
    "week1_schema.sql",
    "week2_schema.sql",
    "week3_schema.sql",
    "week4_schema.sql",
    "week4_analytics_rpc.sql",
    "week5_schema.sql",
    "src/sql/create_get_workspace_analytics.sql",
    "enterprise_schema.sql",
    "supabase/migrations/sprint12_competitive_gaps.sql"
)

foreach ($rel in $files) {
    $path = Join-Path $root $rel
    if (-not (Test-Path $path)) {
        Write-Warning "Skipping missing file: $rel"
        continue
    }
    Write-Host "Applying $rel ..."
    psql $DatabaseUrl -f $path
    if ($LASTEXITCODE -ne 0) {
        throw "Migration failed: $rel"
    }
}

Write-Host "All migrations applied successfully."
