# Feature 006 — Speckit Status

**Updated:** 2026-07-09  
**Track:** [`specs/006-conversational-revenue-loop/`](./)  
**Verdict:** **PHASE 2 + 3 ENG COMPLETE** — Concierge Shadow/AI-Active + escalation + margin gate + audited thread helpers  
**Hermes:** Skipped (founder direction)

---

## Phase board

| Phase | Status | Notes |
|-------|--------|-------|
| **0** De-risk | ✅ | Profile + cost calculator |
| **1** Concierge Shadow | ✅ | S1–S4 |
| **2** Escalation + AI-Active | ✅ | T016–T018 |
| **3** Close loop + Margin | ✅ | T019–T023 eng; T021 commercial checklist |

**Unit tests:** conversation + finops Phase 2/3 suites green

---

## Phase 2 deliverables

| Task | Status |
|------|--------|
| T016 Escalation → Chatwoot | ✅ `escalation-adapter.ts` + `escalation.ts` + persist |
| T017 Annotations → Memory | ✅ `annotations.ts` + feedback webhook |
| T018 AI-Active + runbook | ✅ mode API + `phase-2-oversight.md` |

---

## Phase 3 deliverables

| Task | Status |
|------|--------|
| T019 Audited thread | ✅ ABM `conversationSeed` + `audited-thread.ts` + script |
| T020/T023 Margin gate | ✅ `margin-gate-report.ts` + migration + API |
| T021 Case study | ✅ Checklist (commercial fill) |
| T022 Compliance catalog | ✅ Smoke test |

---

## Operator (parallel — not eng-blocked)

1. Apply `20260720_conversation_qualification_tables.sql` + `20260721_cost_to_serve_snapshots.sql`
2. T009 V1–V4 in clarifications.md
3. Dify publish → `npm run ai:verify`
4. Client sign-off before production `ai_active` flip
5. Hermes: still skipped unless un-skipped
