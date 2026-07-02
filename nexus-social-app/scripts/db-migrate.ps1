# Push supabase/migrations to the linked remote project via npx (no global CLI required).
# Usage: npm run db:migrate

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_supabase-cli.ps1')

$projectRef = Get-SupabaseProjectRef

if (-not (Test-SupabaseLinked)) {
    Write-SupabaseLinkInstructions -ProjectRef $projectRef
    exit 1
}

Write-Host "Pushing migrations to linked Supabase project (ref hint: $projectRef)..." -ForegroundColor Cyan
$result = Invoke-NpxSupabase -SupabaseArgs @('db', 'push')

if ($result.ExitCode -ne 0) {
    if (Test-SupabaseLinkError -Output $result.Output) {
        Write-SupabaseLinkInstructions -ProjectRef $projectRef
    } else {
        Write-Host $result.Output
    }
    exit $result.ExitCode
}

Write-Host 'Migrations pushed successfully.' -ForegroundColor Green
