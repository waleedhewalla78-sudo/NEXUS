# Close GitHub issues for shipped Sprint 18–19 work (Feature 005)
#
# Prerequisites: gh auth login
# Usage (PowerShell):
#   cd nexus-social-app
#   Get-Content scripts/close-github-issues-005-shipped.ps1 | powershell -Command -

$issues = @(7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19)
$comment = @"
Closed via Prompt A ops close-out (2026-07-03).

Sprint 18–19 implementation shipped in repo:
- HubSpot + Salesforce webhooks
- HubSpot batch sync (npm run sync:hubspot-deals)
- MENA compliance profile + settings UI
- ABM live dashboard + verify:abm-seed
- Control plane last-audit

Remaining human gates: docs/GATES-REMAINING.md
Sprint 20 backlog: blocked on A-GATE-003
"@

foreach ($n in $issues) {
  Write-Host "Closing issue #$n..."
  gh issue close $n --comment $comment
}

Write-Host "Done. Issues #7–#19 targeted for close."
