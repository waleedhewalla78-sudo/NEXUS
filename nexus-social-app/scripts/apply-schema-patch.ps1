# Apply schema_patch.sql in Supabase (required for AI agent + inbox tables)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/apply-schema-patch.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$sqlPath = Join-Path $root 'src\sql\schema_patch.sql'
$projectRef = 'lnlzxaqockpjezxskmnb'

Write-Host '=== Nexus Social — Schema patch ===' -ForegroundColor Cyan
Write-Host ''
Write-Host '1. Open Supabase SQL Editor:' -ForegroundColor Yellow
Write-Host "   https://supabase.com/dashboard/project/$projectRef/sql/new"
Write-Host ''
Write-Host '2. Paste the contents of:' -ForegroundColor Yellow
Write-Host "   $sqlPath"
Write-Host ''
Write-Host '3. Click Run (includes NOTIFY pgrst reload at the end)' -ForegroundColor Yellow
Write-Host ''
Write-Host '4. If reads work but npm run ai:setup fails with "schema cache":' -ForegroundColor Yellow
Write-Host '   Run src/sql/reload_postgrest_schema.sql in the same SQL Editor'
Write-Host ''
Write-Host '5. Then in this folder run:' -ForegroundColor Yellow
Write-Host '   npm run ai:setup'
Write-Host '   npm run seed:walkthrough'
Write-Host ''

if (Get-Command clip -ErrorAction SilentlyContinue) {
  Get-Content $sqlPath -Raw | Set-Clipboard
  Write-Host 'Schema SQL copied to clipboard — paste into Supabase SQL Editor.' -ForegroundColor Green
} else {
  Write-Host 'Open the file above and copy/paste into Supabase.' -ForegroundColor DarkGray
}

$sqlUrl = "https://supabase.com/dashboard/project/$projectRef/sql/new"
Write-Host ''
Write-Host "Opening $sqlUrl" -ForegroundColor Cyan
Start-Process $sqlUrl
