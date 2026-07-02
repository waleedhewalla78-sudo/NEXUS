# Feature Specification: Enterprise Revenue Loop (Feature 005)

**Feature Branch:** `005-enterprise-revenue-loop`  
**Created:** 2026-06-25 (`/speckit.specify`)  
**Status:** Sprint 18 Phase I in progress  
**Baseline:** [004 AI CMO](../004-ai-cmo-master-prd-v3/spec.md) · ABM migration applied + seeded  
**User stories:** [user-stories.md](./user-stories.md) (US-021–US-030)

**Input:** Strategic assessment — close the gap from ABM intelligence → governed activation → CRM revenue proof → operator control plane.

---

## 1. Product Vision (What We Want to Build)

Nexus Social evolves from **“governed AI campaign factory”** to **“enterprise revenue operating system”** — where high-intent accounts trigger auditable playbooks, CRM closed-won events credit AI touchpoints, and operators manage eight agents from one cockpit.

### Problem

Enterprise buyers (telco, banking, retail — MENA) accept AI-assisted content only when teams can:

1. **Act** on ABM intent signals (not just view dashboards)
2. **Prove** which AI touches influenced pipeline (CFO/board narrative)
3. **Operate** agent fleets with budgets, approvals, and kill switches
4. **Comply** with regional rules as a product module, not hidden code
5. **Scale** through agencies with per-client FinOps (later phase)

Generic schedulers and AI writers fail on **closed-loop revenue proof** and **regional governance**.

### Personas (005 additions)

| Persona | 005 need |
|---------|----------|
| **ABM operator** | One-click playbook from Vodafone/Cairo Bank card → campaign job |
| **RevOps / CFO** | CRM closed-won → attributed channel revenue in executive export |
| **AI ops lead** | Agent control plane: spend, status, last decision, pending approvals |
| **Compliance officer (MENA)** | Certifiable rule pack: PDPL/DPL, Arabic register, geo restrictions |
| **Agency principal** | Multi-client command center (Phase M — deferred Sprint 20) |

### Strategic principles (inherited + extended)

1. **SoR/SoI** — playbook runs, CRM sync, attribution writes via reconciler only  
2. **Risk-based governance** — ABM activation respects policy tier (MED+ requires approval)  
3. **No demo fallbacks in enterprise UI** — empty state, not hardcoded arrays  
4. **004 non-regression** — 9-layer mesh, campaign workflow, publish path untouched  

### Success metrics (005)

| Metric | Target | Measurement |
|--------|--------|-------------|
| ABM activation rate | ≥1 playbook run / high-intent account / demo | `abm_playbook_runs` |
| Time intent → campaign job | < 30 s (p95) | Activation API latency |
| Attribution CRM linkage | ≥80% closed-won mirrored | `crm_activity_mirror` vs CRM API |
| Control plane adoption | 100% demo workspaces use `/ai-cmo/control-plane` | Analytics |
| Unit test regression | 0 new failures | `npm run test:unit` |

---

## 2. Current State — What We HAVE Built (2026-06-25)

| Area | Status | Evidence |
|------|--------|----------|
| ABM schema + RLS | **Done** | `20260630_enterprise_abm_tables.sql` |
| ABM seed (5 accounts, 12 attribution rows) | **Done** | `npm run seed:abm-demo` |
| ABM UI live API | **Done** | `GET /api/v1/ai-cmo/abm/accounts`, `/attribution` |
| ABM → Strategic Brain injection | **Done** | `fetchAbmIntentContext` in `strategic-brain.ts` |
| CRM mirror ingest API | **Done** | `POST /api/integrations/crm` |
| Attribution nightly job | **Done** | `attribution-calculation` Inngest function |
| Executive audit PDF | **Done** | `GET /api/reports/audit-pdf` |
| 8-agent mesh registry | **Done** | `agents/registry.ts` |
| FinOps ledger + budget guard | **Done** | `cost-ledger.ts`, `budget-guard.ts` |
| Unit tests | **215 pass / 1 skip** | vitest 2026-06-25 |
| Schema UAT | **12/12 OK** | `uat:check-schema` incl. ABM tables |
| Live integration | **5/5** | campaign publish closed loop |
| **ABM activation (intent → job)** | **Not built** | Sprint 18 Phase I |
| **Bi-directional HubSpot/SFDC** | **Not built** | Sprint 18 Phase II |
| **Agent control plane UI** | **Not built** | Sprint 18 Phase I |
| **MENA Compliance Pack (productized)** | **Not built** | Sprint 19 |
| **Agency command center** | **Not built** | Sprint 20 (000014 dependency) |

---

## 3. What We WANT to Build — Requirements

Functional requirements continue at **FR-056+**. Non-functional at **NFR-013+**.

### 3.1 ABM Activation (Phase I)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-056 | System MUST allow operators to trigger an ABM playbook from a target account, enqueueing the existing campaign workflow with ABM-enriched objective | **Sprint 18** |
| FR-057 | System MUST persist `abm_playbook_runs` (account_id, job_id, buyer_stage, topics, triggered_by, status) via reconciler | **Sprint 18** |
| FR-058 | System MUST enforce policy tier on activation (MED/HIGH → approval queue before publish) | **Sprint 18 partial** |
| FR-059 | System MUST expose activation via `POST /api/v1/ai-cmo/abm/accounts/[id]/activate` and server action for UI | **Sprint 18** |

### 3.2 CRM Revenue Closed-Loop (Phase II)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-060 | System MUST sync HubSpot closed-won deals into `crm_activity_mirror` on webhook or scheduled pull | **Sprint 18–19** |
| FR-061 | System MUST link `crm_activity_mirror.account_domain` to `account_intent_scores.domain` for attribution credit | **Sprint 19** |
| FR-062 | System MUST include CRM-sourced closed-won in executive attribution export | **Sprint 19** |
| FR-063 | System MUST support Salesforce opportunity sync (same mirror schema) | **Sprint 19** |

### 3.3 Agent Control Plane (Phase I)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-064 | System MUST expose `GET /api/v1/ai-cmo/agents/control-plane` aggregating agent roster, MTD cost, pending approvals, failed jobs | **Sprint 18** |
| FR-065 | System MUST provide `/ai-cmo/control-plane` UI for operators | **Sprint 18** |
| FR-066 | System MUST show last audit action per agent category (Brain, Creator, Optimizer, etc.) | **Sprint 19** |

### 3.4 MENA Compliance Pack (Phase III)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-067 | System MUST package PDPL/DPL/Egypt DPL rules as workspace-toggleable compliance profile | **Sprint 19** |
| FR-068 | System MUST enforce Arabic register (MSA vs dialect) per brand compliance profile | **Sprint 19** |
| FR-069 | System MUST emit compliance attestation in executive audit PDF when MENA profile active | **Sprint 19** |

### 3.5 Agency Command Center (Phase IV)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-070 | System MUST apply migration 000014 agency hierarchy before agency UI | **Blocked A-GATE-003** |
| FR-071 | System MUST show per-client FinOps rollup for agency tenants | **Sprint 20** |
| FR-072 | System MUST support white-label client approval portal | **Sprint 20** |

### 3.6 Non-functional (005)

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-013 | ABM activation API p95 < 500 ms excluding LLM | **Sprint 18** |
| NFR-014 | No regression: 004 unit + integration gates remain green | **Ongoing** |
| NFR-015 | CRM webhook endpoints MUST verify HMAC signature | **Sprint 19** |

---

## 4. Out of Scope (005)

- Meta App Review / live OAuth (003 human gates)
- Replacing Inngest or Dify
- New social channels before publish gates close
- Full Qdrant memory production (004 S15 backlog)
- Pentest / enterprise IdP SCIM (004 S17 backlog)

---

## 5. Traceability

| User story | FRs | Sprint |
|------------|-----|--------|
| US-021 | FR-056–FR-059 | 18 |
| US-022 | FR-060–FR-063 | 18–19 |
| US-023 | FR-064–FR-066 | 18–19 |
| US-024 | FR-067–FR-069 | 19 |
| US-025 | FR-070–FR-072 | 20 |

See [user-stories.md](./user-stories.md) for acceptance scenarios.
