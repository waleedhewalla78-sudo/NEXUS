# Plan: Feature 005 Enterprise Revenue Loop

**Input:** [spec.md](./spec.md) · [clarifications.md](./clarifications.md) · [analysis.md](./analysis.md)  
**Stack:** Next.js 15 · Supabase Postgres + RLS · Inngest · Redis · existing 8-agent mesh · TypeScript strict

---

## Sprint map

| Sprint | Phase | Theme | Exit criteria |
|--------|-------|-------|---------------|
| **18** | I | ABM Activation + Control Plane | Activate playbook E2E; control plane page live |
| **19** | II–III | CRM loop + MENA pack | HubSpot webhook; compliance profile toggle |
| **20** | IV | Agency command center | Blocked on 000014 / A-GATE-003 |

---

## Phase I — ABM Activation + Control Plane (Sprint 18)

### Architecture

```text
/ai-cmo/abm (UI)
  → POST activate (server action or API)
    → activate-playbook.ts
      → build objective from account_intent_scores
      → createProcessingCampaignJob (Redis)
      → sendAiCmoInngestEvent(CAMPAIGN_REQUESTED)
      → secureSyncToSoR(abm_playbook_runs)
  → Strategic Brain (existing) reads ABM context at plan time

/ai-cmo/control-plane (UI)
  → GET /api/v1/ai-cmo/agents/control-plane
    → control-plane-query.ts
      → registry metadata + cost_summary + approvals + audit_logs
```

### New files

| Path | Purpose |
|------|---------|
| `supabase/migrations/20260701_abm_playbook_runs.sql` | Playbook run audit table |
| `src/lib/ai-cmo/abm/activate-playbook.ts` | Activation logic |
| `src/lib/ai-cmo/agents/control-plane-query.ts` | Aggregation |
| `src/app/api/v1/ai-cmo/abm/accounts/[id]/activate/route.ts` | REST activate |
| `src/app/api/v1/ai-cmo/agents/control-plane/route.ts` | Control plane API |
| `src/app/ai-cmo/control-plane/page.tsx` | Operator UI |
| `src/actions/abm-activate.ts` | Session-auth server action |
| `src/lib/ai-cmo/abm/__tests__/activate-playbook.test.ts` | Unit tests |

### Modified files

| Path | Change |
|------|--------|
| `src/app/ai-cmo/abm/AbmDashboardClient.tsx` | Activate button + job toast |
| `src/lib/sync/reconciler.ts` | Add `abm_playbook_runs` Sor schema |
| `src/app/ai-cmo/layout.tsx` | Nav link control plane |
| `scripts/check-uat-schema.ts` | Include `abm_playbook_runs` |

### Tech decisions

- **No new npm deps**
- **Reconciler-only** writes to `abm_playbook_runs`
- **Rate limit:** 10 activations/hour/workspace (Redis INCR)
- **Auth:** Session (UI) + x-api-key (API) via existing patterns

---

## Phase II — CRM Closed-Loop (Sprint 19)

- `POST /api/integrations/crm/webhook/hubspot` with signature verify
- `scripts/sync-hubspot-deals.ts` for batch pull
- Extend `attribution/calculate.ts` to credit CRM closed-won by domain
- Update executive export in `abm-dashboard.ts`

---

## Phase III — MENA Compliance Pack (Sprint 19)

- `compliance-profiles/mena-v1.ts` rule catalog
- Workspace settings toggle API
- Compliance agent reads profile at runtime
- Audit PDF attestation section

---

## Phase IV — Agency Command Center (Sprint 20)

- Apply `000014` after A-GATE-003
- Agency rollup FinOps view
- Client switcher in nav

---

## Verification gates (each sprint)

```powershell
npm run typecheck
npm run test:unit
npm run uat:check-schema
npm run verify:abm-seed
npm run test:live-integration  # Sprint 18 close
```

---

## Dependencies

| Upstream | Downstream |
|----------|------------|
| ABM tables seeded | Activation |
| Campaign workflow | Activation |
| `ai_cmo_cost_summary` MV | Control plane |
| A-GATE-003 | Agency phase |
