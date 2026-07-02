# Stop stale Next.js dev servers and start a fresh instance on the reserved dev port.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/restart-dev.ps1

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'dev-port.ps1')
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$lockFile = Join-Path $root '.next\dev\lock'
if (Test-Path $lockFile) {
  try {
    $lockContent = Get-Content $lockFile -Raw -ErrorAction Stop
    if ($lockContent -match 'pid[:\s]+(\d+)') {
      $pid = [int]$Matches[1]
      Write-Host "Stopping Next.js dev server (PID $pid)..."
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
  } catch {
    Write-Host 'Could not read dev lock file; stopping listeners on dev ports instead...'
  }
}

$portsToFree = @(3000, 3001, 3002, $DevPort)
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in $portsToFree } |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object {
    if ($_ -gt 0) {
      Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
  }

Start-Sleep -Seconds 2

# Drop stale placeholder env from `npm run preflight` so Next.js loads .env.local values.
$placeholderKeys = @(
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DIFY_API_KEY',
  'INTERNAL_TOOL_SECRET',
  'CHATWOOT_WEBHOOK_SECRET',
  'APPROVAL_HMAC_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET'
)
foreach ($key in $placeholderKeys) {
  $value = (Get-Item -Path "env:$key" -ErrorAction SilentlyContinue).Value
  if ($value -match 'placeholder|preflight') {
    Remove-Item -Path "env:$key" -ErrorAction SilentlyContinue
    Write-Host "Cleared stale $key from shell environment."
  }
}

Write-Host "Starting npm run dev on $DevUrl ..."
npm run dev
