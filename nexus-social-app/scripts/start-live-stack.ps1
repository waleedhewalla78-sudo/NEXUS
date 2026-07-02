# Start Redis + local AI worker for live inbox / webhook processing
# Usage: powershell -ExecutionPolicy Bypass -File scripts/start-live-stack.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host '[live-stack] Starting Redis...' -ForegroundColor Cyan
docker compose -f docker-compose.redis.yml up -d

Start-Sleep -Seconds 2

if (Get-Command redis-cli -ErrorAction SilentlyContinue) {
  $pong = redis-cli ping 2>$null
  Write-Host "[live-stack] Redis ping: $pong" -ForegroundColor Green
} else {
  Write-Host '[live-stack] redis-cli not installed — Redis container started on :6379' -ForegroundColor Yellow
}

Write-Host '[live-stack] Starting AI worker (npm run worker:dev)...' -ForegroundColor Cyan
Write-Host '  Stop with Ctrl+C or kill the node process.' -ForegroundColor DarkGray

npm run worker:dev
