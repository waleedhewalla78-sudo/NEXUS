# Implementation Plan — Feature 005 Phases I–M

Detailed execution guide for [plan.md](./plan.md).

---

## Phase I — Sprint 18 (implementing now)

### Step 1: Schema

Apply `20260701_abm_playbook_runs.sql` in Supabase SQL Editor or `db:migrate`.

### Step 2: Activation library

`activate-playbook.ts`:
1. Load account by id + workspace (admin client for API key path)
2. Build objective string
3. `createProcessingCampaignJob` + Inngest event
4. `secureSyncToSoR` playbook run row

### Step 3: API + action + UI

- REST route for integrators
- Server action for logged-in operators
- Button on account card with loading state + link to job poll

### Step 4: Control plane

- Static agent metadata (name, tier, description)
- Query cost summary, approvals, failed jobs, recent audit
- Simple table UI at `/ai-cmo/control-plane`

### Step 5: Tests + gates

Unit tests for objective builder and control plane aggregation (mock supabase).

---

## Phase II — Sprint 19

HubSpot webhook → crm_activity_mirror → attribution domain join → export update.

---

## Phase III — Sprint 19

MENA profile JSON + compliance agent hook + PDF attestation.

---

## Phase IV — Sprint 20

Agency hierarchy after leadership gate.

---

## Rollback

- Drop `abm_playbook_runs` only affects activation audit; ABM tables unchanged
- Feature flag: `ABM_ACTIVATION_ENABLED=false` env (optional, not required Sprint 18)
