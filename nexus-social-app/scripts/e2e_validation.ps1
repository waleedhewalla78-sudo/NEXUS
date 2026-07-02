# PowerShell script to validate end-to-end AI orchestration
# Usage: powershell -ExecutionPolicy Bypass -File scripts/e2e_validation.ps1

$ErrorActionPreference = 'Stop'
# Ensure artifacts/e2e directory exists
$artifactDir = Join-Path -Path "$PSScriptRoot" -ChildPath "../artifacts/e2e"
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
# Start transcript to capture all output
$logFile = Join-Path -Path $artifactDir -ChildPath "e2e_validation_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
Start-Transcript -Path $logFile -NoClobber

# Configuration
$webhookUrl = 'http://127.0.0.1:3000/api/webhooks/chatwoot-ai'

# Sample payload (adjust as needed)
$payload = @{ 
    event = 'message_created' 
    message = @{ message_type = 0; content = 'E2E test payload'; id = 1234 } 
    conversation = @{ id = 5678; inbox_id = 1; contact_inbox = @{ contact_id = 42 } } 
    inbox = @{ id = 1 } 
} | ConvertTo-Json -Depth 5

Write-Host '[E2E] Sending sample Chatwoot webhook payload...'
Invoke-WebRequest -Uri $webhookUrl -Method POST -Body $payload -ContentType 'application/json' -Headers @{ 'x-e2e-test' = 'true' } -UseBasicParsing | Out-Null

Write-Host '[E2E] Waiting for worker to process the job...'
Start-Sleep -Seconds 5

# Optional Redis queue length check
if (Get-Command redis-cli -ErrorAction SilentlyContinue) {
    $queueLen = redis-cli LLEN queue:ai-orchestration 2>$null
    Write-Host "[E2E] Redis queue 'queue:ai-orchestration' length: $queueLen"
} else {
    Write-Host '[E2E] redis-cli not found – skipping Redis check'
}

Write-Host '[E2E] Validation script finished.'
Stop-Transcript
