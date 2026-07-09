# Feature 006 Phase 1 — UAT Checklist

**Date:** 2026-07-09  
**Scope:** Sprints 1–4 eng complete (Shadow Mode Concierge path)

## Pre-flight

- [ ] Apply `supabase/migrations/20260720_conversation_qualification_tables.sql` in Supabase SQL Editor
- [ ] Confirm `NOTIFY pgrst, 'reload schema'` ran
- [ ] `npm run seed:walkthrough` (workspace `11111111-…`)
- [ ] Dev server on `:3005`; Redis up for Chatwoot path (optional for sync API)

## Automated

- [x] Unit: sprint1-foundation, sprint2-inbound, sprint3-llm, sprint4-harden, agent-mesh
- [ ] Optional live: `POST /api/v1/ai-cmo/conversations/inbound` with `"sync": true`

### Sync smoke (PowerShell)

```powershell
$body = @{
  workspaceId = "11111111-1111-1111-1111-111111111111"
  conversationId = "uat-1"
  inboundText = "عايز أشتري budget 50k email sales@acme.com"
  channel = "chatwoot"
  locale = "ar-EG"
  sync = $true
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3005/api/v1/ai-cmo/conversations/inbound" -Method POST -ContentType "application/json" -Body $body
```

Expect: `ok: true`, `mode: shadow`, `autoSend: false`, `draftReply` present.

## Manual / ops (parallel — not blocking eng close)

- [ ] Dify app published (`npm run ai:verify`)
- [ ] V1–V4 verification (#31)
- [ ] Chatwoot inbox mapped for a real workspace (live fan-out)

## Exit

Phase 1 eng **PASS** when automated checks green and migration applied on target DB.  
AI-Active send + escalation = **Phase 2** (not this checklist).
