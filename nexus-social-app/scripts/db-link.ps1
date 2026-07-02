# Link this repo to a remote Supabase project (one-time setup).
# Usage: npm run db:link

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_supabase-cli.ps1')

$projectRef = Get-SupabaseProjectRef

Write-Host "Linking to Supabase project: $projectRef" -ForegroundColor Cyan
Write-Host 'You will be prompted to log in and enter the database password.' -ForegroundColor DarkGray
Write-Host ''

$result = Invoke-NpxSupabase -SupabaseArgs @('link', '--project-ref', $projectRef)

if ($result.ExitCode -ne 0) {
    Write-Host $result.Output
    Write-Host ''
    Write-Host 'Link failed. Verify the project ref in .env.local (NEXT_PUBLIC_SUPABASE_URL) or set SUPABASE_PROJECT_REF.' -ForegroundColor Yellow
    Write-Host "Dashboard: https://supabase.com/dashboard/project/$projectRef" -ForegroundColor Yellow
    exit $result.ExitCode
}

Write-Host ''
Write-Host 'Linked successfully. Run: npm run db:migrate' -ForegroundColor Green
