# Feature 006 — Speckit Status

**Updated:** 2026-07-09  
**Track:** [`specs/006-conversational-revenue-loop/`](./)  
**Verdict:** **PHASE 1 COMPLETE (eng)** — S1–S4 done · Shadow Mode Concierge path  
**Hermes:** Skipped (founder direction)

---

## Phase 1 sprint board

| Sprint | Status | Notes |
|--------|--------|-------|
| **S1 Foundation** | ✅ | Migration, Concierge scaffold, reconciler, Shadow config |
| **S2 Orchestration** | ✅ | Inngest inbound, Chatwoot fan-out, sync/poll API |
| **S3 Qualify → CRM** | ✅ | ProviderRouter enrichment + accountDomain on leads |
| **S4 Harden + UAT** | ✅ | Failure resilience tests + [phase-1-uat.md](./checklists/phase-1-uat.md) |

**Unit tests:** 26 passed (sprint1–4 + agent-mesh)

---

## Phase 2 (next track — not started)

Escalation → Chatwoot assign (T016), annotations (T017), AI-Active flip (T018)

---

## Operator before live Shadow UAT

1. Apply `20260720_conversation_qualification_tables.sql`  
2. Optional: Dify publish for LLM enrichment  
3. Smoke: `POST /api/v1/ai-cmo/conversations/inbound` with `"sync": true`  
