# User Stories — Feature 005 Enterprise Revenue Loop

**Personas:** ABM operator · RevOps/CFO · AI ops lead · Compliance officer · Agency principal  
**Format:** US-021+ · Maps to FR-056–FR-072

---

## US-021 — Activate ABM playbook from account card

**As an** ABM operator  
**I want to** trigger a governed campaign from a high-intent account (e.g. Vodafone Egypt)  
**So that** intent signals become revenue motion without manual brief re-entry

**Acceptance scenarios**

1. **Given** seeded account with `intent_score ≥ 70` and `buyer_stage = decision`, **When** I click **Activate playbook** on `/ai-cmo/abm`, **Then** system enqueues campaign job with ABM-enriched objective and returns `jobId` + poll URL.
2. **Given** activation succeeds, **Then** row appears in `abm_playbook_runs` with `status = processing`.
3. **Given** account in MED/HIGH policy tier, **When** activation runs, **Then** content enters approval queue before auto-publish.
4. **Given** no accounts in DB, **Then** UI shows empty state (not demo data).

**FR:** FR-056, FR-057, FR-058, FR-059 · **Sprint:** 18

---

## US-022 — Prove CRM-influenced revenue

**As a** RevOps lead / CFO  
**I want** closed-won CRM deals credited to social/AI channels  
**So that** I can defend AI marketing spend to the board

**Acceptance scenarios**

1. **Given** HubSpot webhook for `deal.closed_won`, **When** event received, **Then** row upserted in `crm_activity_mirror` with `deal_value`.
2. **Given** mirrored deal for `vodafone.com.eg`, **When** attribution job runs, **Then** `attribution_reports` reflects CRM-sourced revenue component.
3. **Given** executive export, **Then** summary includes CRM closed-won total for period.

**FR:** FR-060–FR-063 · **Sprint:** 18–19

---

## US-023 — Operate agents from control plane

**As an** AI ops lead  
**I want** one dashboard for all eight agents  
**So that** I can monitor spend, failures, and approvals without digging through logs

**Acceptance scenarios**

1. **Given** logged-in operator, **When** I open `/ai-cmo/control-plane`, **Then** I see agent roster, MTD cost, pending approvals, failed jobs.
2. **Given** API call `GET /api/v1/ai-cmo/agents/control-plane`, **Then** JSON matches UI data (session or API key auth).
3. **Given** Strategic Brain ran a campaign today, **Then** control plane shows Brain as active with recent audit entry.

**FR:** FR-064–FR-066 · **Sprint:** 18–19

---

## US-024 — Enable MENA compliance profile

**As a** compliance officer at Cairo Bank  
**I want** a toggleable MENA compliance pack  
**So that** AI output meets PDPL/DPL and formal Arabic requirements

**Acceptance scenarios**

1. **Given** workspace enables MENA profile, **When** Creator generates Arabic content, **Then** MSA register rules apply.
2. **Given** policy violation (profiling claim), **Then** CRITICAL block regardless of confidence.
3. **Given** audit PDF export with MENA profile, **Then** attestation section lists active rule pack version.

**FR:** FR-067–FR-069 · **Sprint:** 19

---

## US-025 — Manage agency clients (deferred)

**As an** agency principal  
**I want** per-client FinOps and approval queues  
**So that** I scale AI CMO across 30 brands without margin erosion

**Acceptance scenarios**

1. **Given** agency hierarchy migration applied, **When** I switch client brand, **Then** ABM and FinOps scope to that client workspace.
2. **Given** agency rollup view, **Then** total AI spend across clients is visible.

**FR:** FR-070–FR-072 · **Sprint:** 20 · **Blocked:** A-GATE-003

---

## US-026 — Network-visible ABM data (complete)

**As an** enterprise CTO  
**I want** ABM dashboard network calls to hit PostgreSQL APIs  
**So that** “Enterprise Intelligence” narrative holds under inspection

**Status:** **Done** (pre-005) — `GET /api/v1/ai-cmo/abm/accounts`

---

## US-027 — Explainability from database topics

**As an** operator  
**I want** “Why?” on account cards to show DB `topics` and `buyer_stage`  
**So that** decisions are auditable

**Status:** **Done** (pre-005)

---

## US-028 — Seed enterprise demo accounts

**As a** sales engineer  
**I want** one-command seed for Vodafone/Cairo Bank/ADCB  
**So that** demos are repeatable

**Status:** **Done** — `npm run seed:abm-demo`

---

## US-029 — HubSpot OAuth connection (future)

**As a** RevOps admin  
**I want** to connect HubSpot once per workspace  
**So that** deals sync without manual CSV

**Sprint:** 19 · Depends US-022

---

## US-030 — Salesforce opportunity sync (future)

**As a** enterprise admin  
**I want** Salesforce closed-won sync  
**So that** ADCB-style FinTech accounts get native CRM proof

**Sprint:** 19 · Depends US-022
