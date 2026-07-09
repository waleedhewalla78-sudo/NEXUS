# Feature 006 Phase 1 — Sprint Plan (Concierge MVP + Shadow Mode)

**Track:** `006-conversational-revenue-loop`  
**Created:** 2026-07-09  
**Prerequisite:** Phase 0 shipped (`472aa90`). Hermes **skipped** this cycle.  
**CL-052 note:** Founder authorized Phase 1 eng start; human V1–V4 + Dify publish remain parallel ops (do not block schema/agent scaffold).

---

## Sprint list (Phase 1)

| Sprint | Window | Goal | Exit criteria | Tasks |
|--------|--------|------|---------------|-------|
| **S1 — Foundation** | Immediate | Schema + types + Concierge scaffold + reconciler + Shadow config | ✅ Done |
| **S2 — Orchestration** | After S1 | `CONVERSATION_INBOUND` Inngest + Chatwoot fan-out + API | ✅ Done |
| **S3 — Qualify → CRM** | After S2 | ProviderRouter Concierge + accountDomain on qualified_leads | ✅ Done |
| **S4 — Harden + UAT** | After S3 | Failure resilience tests + UAT checklist + Speckit close | ✅ Done |

**Out of Phase 1 (Phase 2+):** Escalation Chatwoot assign (T016), annotations (T017), AI-Active flip (T018), ABM E2E (T019), live margin gate (T020).

---

## Sprint 1 — Product spec (detailed)

### Objective
Stand up the **data + agent contract** for conversational qualification without changing campaign-workflow or existing reconciler validation (CL-030 additive only).

### Deliverables
1. Migration `20260720_conversation_qualification_tables.sql`
   - `conversation_qualifications`, `conversation_escalations`, `lead_scores`, `qualified_leads`
   - RLS + service_role policies
2. Domain types + Zod schemas for inbound conversation payloads and slots
3. Concierge agent (9th mesh agent) — rules-based slot extraction + draft reply scaffold
4. Additive `SorTableNames` + write schemas for the four tables
5. Shadow Mode workspace config helper (`shadow` | `ai_active` | `off`)
6. Unit tests for slots, agent, reconciler schema validation

### Acceptance criteria
- [ ] SQL is idempotent and follows intelligence/enterprise_leads RLS pattern
- [ ] `AgentName` includes `concierge`; registry returns agent
- [ ] `secureSyncToSoR` accepts `qualified_leads` payload shape in unit tests
- [ ] Shadow mode defaults to `shadow` for new conversational workspaces
- [ ] `npm test` for new files PASS
- [ ] No edits to `inngest-campaign-workflow.ts` or existing reconciler table schemas

### Non-goals (S1)
- Live Chatwoot webhook wiring  
- Inngest function registration  
- Dify/OpenRouter live calls (stub OK)  
- UI pages  

---

## Sprint 2 — Product spec

**Goal:** Async inbound path.  
**Status:** ✅ Eng complete 2026-07-09  
**Deliverables:**
- `conversation-inbound-workflow.ts` + `process-inbound.ts`
- Event `ai-cmo/conversation.inbound` registered in Inngest serve
- Chatwoot webhook fan-out (non-blocking) to Concierge
- API `POST/GET /api/v1/ai-cmo/conversations/inbound` (202 + poll, or `sync:true`)
- Unit tests for processor + event schema

**Depends on:** S1.  
**Does not:** auto-send Chatwoot replies (Shadow); LLM Concierge (S3).

---

## Sprint 3 — Product spec ✅

**Goal:** End-to-end qualify in Shadow.  
**Status:** ✅ Eng complete 2026-07-09  
**Deliverables:** ProviderRouter Concierge enrichment (`llm-enrichment.ts`), `accountDomain` on `qualified_leads`, LLM fail → rules fallback.  
**Depends on:** S2.

---

## Sprint 4 — Product spec ✅

**Goal:** Harden.  
**Status:** ✅ Eng complete 2026-07-09  
**Deliverables:** Failure resilience tests, [phase-1-uat.md](./checklists/phase-1-uat.md), Speckit finalize.  
**Depends on:** S3.  
**Exit:** Phase 1 eng complete → Phase 2 gated on pilot ops.

---

## Dependency graph

```
S1 Foundation ──► S2 Orchestration ──► S3 Qualify/CRM ──► S4 Harden
                      │
                      └── parallel: Dify publish + V1–V4 (ops)
```
