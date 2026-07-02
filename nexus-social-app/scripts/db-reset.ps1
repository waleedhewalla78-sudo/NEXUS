# Reset local Supabase database via npx (requires local Supabase stack).
# Usage: npm run db:reset

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_supabase-cli.ps1')

Write-Host 'Resetting local Supabase database...' -ForegroundColor Cyan
$result = Invoke-NpxSupabase -SupabaseArgs @('db', 'reset')

if ($result.ExitCode -ne 0) {
    Write-Host $result.Output
    Write-Host ''
    Write-Host 'db:reset requires a running local Supabase instance (supabase start).' -ForegroundColor Yellow
    exit $result.ExitCode
}

Write-Host 'Local database reset complete.' -ForegroundColor Green
