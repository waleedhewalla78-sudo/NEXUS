# Feature 006 — Technical Plan

**Created:** 2026-07-09 (`/speckit.plan`)  
**Stack:** Next.js 16 · Supabase · Redis · Inngest · Chatwoot · Dify/OpenRouter · Qdrant · Policy Engine V2

---

## 1. Architecture (additive on 9-layer mesh)

| Layer | Existing | 006 addition |
|-------|----------|--------------|
| L1 Dashboard | `/inbox`, ABM cards | Shadow draft indicators; later “Activate → Conversation” on ABM |
| L2 API | Chatwoot webhook | Qualification handler on existing queue path |
| L3 Orchestration | 8 Inngest functions | `CONVERSATION_INBOUND` (mirror CL-023 pattern) |
| L4 Governance | `mena_v1` | `mena_conversational_v1` |
| L5 Memory | PG + Qdrant | Transcripts + annotations |
| L6 Agents | 8 agents | **Concierge** (9th) — Phase 1 |
| L7 Reconciler | SoR writes | Additive `qualified_leads` validation |
| L8 FinOps | LLM cost ledger | Cost-to-serve + margin gate |
| L9 Learning | Optimizer/evals | Escalation outcomes → Concierge |

**CL-030:** Do not change `inngest-campaign-workflow.ts` step order or `reconciler.ts` core validation.

---

## 2. Phase 0 deliverables (implement now)

1. `mena_conversational_v1` compliance profile + unit tests  
2. Cost-to-serve / margin calculator module + unit tests  
3. Speckit artifacts (this track)  
4. Constitution amendment (Feature 006 + CL-048–054)  

## 3. Phase 1+ (gated — CL-052)

1. Migration `20260720_conversation_qualification_tables.sql`  
   - `conversation_qualifications`, `conversation_escalations`, `lead_scores`, `qualified_leads`  
2. Concierge agent + registry extension (`AgentName` includes `concierge`)  
3. Inngest `conversation-inbound` function  
4. Shadow Mode workspace flag  
5. Chatwoot escalation adapter  

## 4. Tech decisions

| Topic | Choice |
|-------|--------|
| LLM | ProviderRouter (Dify → OpenRouter); no fine-tuning |
| HITL UI | Chatwoot only |
| CRM write | Reconciler → `qualified_leads` → link `crm_activity_mirror` |
| WhatsApp | Via Chatwoot channel / BSP — no native sync worker (CL-038) |
| Agency | Deferred (CL-029) |

## 5. Test plan

| Phase | Tests |
|-------|-------|
| 0 | Profile rules unit; margin formula unit |
| 1 | Concierge slot extraction unit; reconciler write integration |
| 2 | Escalation routing unit; Shadow/AI-Active flag |
| 3 | E2E attribution thread (staging); margin gate report |

## 6. Risks

| Risk | Mitigation |
|------|------------|
| Building before traffic | CL-052 hard gate |
| Duplicate console | CL-049 |
| Dialect quality | Shadow Mode + Conversation Designer |
| Margin fail | CL-053 stop-scale |
