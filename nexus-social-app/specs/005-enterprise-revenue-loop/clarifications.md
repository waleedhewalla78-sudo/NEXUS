# Clarifications: Feature 005 Enterprise Revenue Loop

Resolved ambiguities for Sprint 18–20. Supersede PRD defaults where noted.

---

## CL-023: ABM Activation — Campaign path vs new workflow

**Decision:** Reuse **existing** `CAMPAIGN_REQUESTED` Inngest event + `createProcessingCampaignJob`. Do not create a parallel ABM workflow engine.

**Rationale:** Constitution mandates minimal diff; Strategic Brain already injects ABM context via `fetchAbmIntentContext:``` objective prefix includes account name, topics, buyer_stage.

**Implementation:** `src/lib/ai-cmo/abm/activate-playbook.ts` → enqueue same path as `POST /api/v1/ai-cmo/campaigns`. Objective prefix includes account name, topics, and buyer stage.

---

## CL-024: `abm_playbook_runs` schema

**Decision:**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workspace_id | uuid FK | RLS |
| account_intent_id | uuid FK | → account_intent_scores |
| campaign_job_id | text | Redis job id |
| status | enum | queued, processing, completed, failed |
| objective_preview | text | First 500 chars |
| triggered_by | uuid | user id |
| created_at | timestamptz | |

Unique: none (multiple runs per account allowed).

---

## CL-025: Activation policy tier mapping

**Decision:**

| Intent score | Policy tier | Behavior |
|--------------|-------------|----------|
| ≥ 70 | MED | Campaign runs; publish step requires approval if content HIGH |
| 40–69 | LOW | Standard workflow |
| < 40 | LOW | Allow activation; warn in UI |

Do not block activation on score alone — block only on CRITICAL policy violations in generated content.

---

## CL-026: CRM sync transport (Phase II)

**Decision:** Phase II ships **webhook ingest** (`POST /api/integrations/crm/webhook/hubspot`) + **manual pull script** (`scripts/sync-hubspot-deals.ts`). Full OAuth connection UI deferred to Sprint 19.

**Rationale:** Demo path uses seeded `crm_activity_mirror`; live HubSpot requires customer credentials.

---

## CL-027: Control plane data sources

**Decision:** Aggregate from existing tables only — no new agent heartbeat table in Sprint 18.

| Signal | Source |
|--------|--------|
| Agent roster | `agents/registry.ts` static metadata |
| MTD cost | `ai_cmo_cost_summary.agent_breakdown` |
| Pending approvals | `ai_cmo_approval_requests` count |
| Failed jobs | `ai_cmo_failed_jobs` count |
| Recent activity | `audit_logs` last 10 ABM/agent actions |

---

## CL-028: MENA Compliance Pack storage

**Decision:** `workspaces.settings.compliance_profile` JSONB key (`mena_v1` | `global_default`). Rules catalog in `src/lib/governance/compliance-profiles/mena-v1.ts`.

**Future:** Dedicated `compliance_profiles` table if >3 profiles needed.

---

## CL-029: Agency hierarchy gate

**Decision:** FR-070–FR-072 **blocked** until A-GATE-003 sign-off and `000014` applied. No agency UI in Sprint 18.

---

## CL-030: Feature 004 regression boundary

**Decision:** Feature 005 MUST NOT modify:
- `campaign-workflow.ts` step order
- `reconciler.ts` validation for existing Sor tables (only additive)
- Webhook auth for Meta/LinkedIn
- Agent mesh test fixtures without updating tests

**Verify:** `npm run test:unit && npm run test:live-integration` before Sprint 18 close.

---

## Open questions (resolved)

| Question | Resolution |
|----------|------------|
| API key vs session for ABM activate? | Both — session via server action; API via POST with x-api-key |
| Drop demo fallbacks? | Yes — done in pre-005 ABM wiring |
| HubSpot first or Salesforce? | HubSpot webhook first (CL-026) |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-25 | CL-023–CL-030 initial clarify pass |
