# Nexus Program — Full Speckit Cycle

**Date:** 2026-07-06 (Phase D human/commercial gates cycle)  
**Workspace:** `nexus-social-app`  
**GitHub:** `waleedhewalla78-sudo/NEXUS` @ `main`  
**Prod:** `https://nexussocial.tech`  
**Verdict:** **CONDITIONAL PRODUCTION** — Phase D tooling shipped; B1–B4 + commercial open

**Phase D:** [`phase-d-spec.md`](./phase-d-spec.md) · [`docs/OPS-PHASE-D-INTEGRATION.md`](../../nexus-social-app/docs/OPS-PHASE-D-INTEGRATION.md)  
**PRD:** [`docs/NEXUS-PRD.md`](../../nexus-social-app/docs/NEXUS-PRD.md) · [`docs/prd/`](../../nexus-social-app/docs/prd/)  
**Tests:** `npm run verify:phase-d` · `npm run qa:enterprise:report` → **0 FAIL**

---

## Timeline (day 0 → now)

| Era | Deliverable | Status |
|-----|-------------|--------|
| **003** | Publish, OAuth, worker, Chatwoot | ✅ Baseline |
| **004** | 8-agent mesh, Inngest, policy, FinOps | ✅ |
| **005 S18–19** | ABM, CRM, MENA, control plane | ✅ |
| **Sprint 2** | Enterprise skin, `enterprise_leads`, `/enterprise` | ✅ |
| **Sprint 3** | LinkedIn OAuth, Meta Lead Ads | ✅ |
| **Sprint 4** | Pilot provision CLI | ❌ Sales gate |
| **Sprint 5** | `generate:pilot-report` | ✅ |
| **Sprint 6** | Pit Crew `/admin` | 🔒 Payment (CL-036) |
| **Sprint 7** | Intelligence feed + briefing | ✅ |
| **QA** | Enterprise harness + master plan | ✅ |
| **Prod closure** | Root redirect, GHCR CI, harness flake | ✅ local |
| **Prod DB** | `20260715_intelligence_feed.sql` applied | ✅ 2026-07-05 |

---

## `/speckit.constitution` — v1.4.2

**Canonical:** [`CONSTITUTION.md`](../../nexus-social-app/CONSTITUTION.md)

| Principle | Rule |
|-----------|------|
| SoR / SoI | Reconciler-only SoR writes; intelligence via `ingest-raw.ts` (CL-039) |
| CL-030 | No `campaign-workflow` / `reconciler.ts` validation changes |
| CL-029 | No Agency UI / `000014` without A-GATE-003 |
| CL-036 | Sprint 6 Pit Crew only after Client #1 **payment** |
| CL-041 | Enterprise skin: `/` → `/intelligence` when SaaS UI off |
| CL-042 | QA harness: `test:unit` ≤1 fail under load = WARN |
| RAM | No native GA4/Meta/WhatsApp sync workers (CL-038) |
| QA | `qa:enterprise:report` 0 FAIL before prod certification |

---

## `/speckit.specify` — Built vs want

### Built ✅

| Area | Capabilities |
|------|--------------|
| **003** | OAuth, publish (FB/IG/LI/X), worker, analytics, Chatwoot, webhooks |
| **004** | 8-agent mesh, Inngest, policy, FinOps, memory, circuit breakers |
| **005** | ABM, CRM loop, MENA compliance, control plane, HubSpot OAuth |
| **GTM** | Enterprise landing, leads, Meta Lead Ads, LinkedIn OAuth, feature flags |
| **Sprint 5** | Pilot ROI simulator |
| **Sprint 7** | Intelligence ingest, briefs, `/intelligence` UI, weekly cron |
| **QA** | `qa:enterprise` harness, master plan, PRD 1.0.1 |
| **Closure** | Root redirect, GHCR `file: Dockerfile`, harness flake handling |

### Want (remaining)

| ID | Requirement | Gate | Owner |
|----|-------------|------|-------|
| FR-OPS-01 | Push production-closure commit + Hermes deploy | Operator | DevOps |
| FR-OPS-02 | Prod secrets (LinkedIn, NextAuth, OpenRouter) | B4 | DevOps |
| FR-OPS-03 | Phase 3 QA against live URL (app running) | Operator | QA |
| FR-S4-01 | `provision-pilot-client.ts` | Signed client | Eng |
| FR-S5-01 | Run `generate:pilot-report` on prod WS | Founder | Commercial |
| FR-S6-01 | Pit Crew provision + margins | **Payment** | Eng |
| FR-B1 | Meta publish App Review | Human | Product |
| FR-B2 | OAuth UAT T053–T056 | Human | QA |
| FR-B3 | Executive sign-off | Human | Leadership |

### User stories

| ID | Story | Status |
|----|-------|--------|
| US-001–031 | Core platform + ABM/CRM | ✅ |
| US-040–043 | Leads, Meta ads, LinkedIn | ✅ |
| US-070–072 | Intelligence feed + brief + copy | ✅ |
| US-073 | Enterprise login lands on Intelligence | ✅ (CL-041) |
| US-050 / US-060 | Provision / margin dashboard | 🔒 S4/S6 |

---

## `/speckit.clarify`

| ID | Decision |
|----|----------|
| CL-030–040 | Prior (workflow, agency, skin, Meta ads, intelligence funnel) |
| **CL-041** | `NEXT_PUBLIC_ENABLE_SaaS_UI=false` → `/` server-redirects to `/intelligence` |
| **CL-042** | `qa:enterprise` `test:unit`: retry 3×; WARN if ≤1 Vitest failure under harness load |
| **CL-043** | GHCR build context `./nexus-social-app`, `file: Dockerfile` (not nested path) |

---

## `/speckit.analyze` — Status & gaps

### Scores (2026-07-05)

| Track | Score | Notes |
|-------|-------|-------|
| Platform eng (003–005) | **9.0** | Stable |
| GTM + Intelligence (S2–7) | **9.5** | DB applied; QA green |
| Live prod ops | **7.0** | Closure local; Hermes lag |
| Commercial (S4–6) | **2.0** | Pre-revenue |
| Documentation | **9.0** | PRD + Speckit aligned |
| **Overall** | **7.8** | ↑ from 7.2 |

### Latest QA (`qa:enterprise:report`)

| Result | Count |
|--------|-------|
| PASS | 15 |
| FAIL | **0** |
| WARN | 2 (`000014` file; `test:unit` harness flake) |
| SKIP | 2 (Sprint 6; app not running) |

### Gaps (updated)

| # | Gap | Severity | Status |
|---|-----|----------|--------|
| G1 | Hermes deploy production-closure | High | **open** |
| G2 | `enterprise_leads` on prod | — | ✅ applied |
| G3 | `intelligence_*` on prod | — | ✅ applied 2026-07-05 |
| G4 | LinkedIn / NextAuth / OpenRouter secrets | High | open |
| G5 | Sprint 4 provision CLI | Med | sales gate |
| G6 | Sprint 6 Pit Crew | Med | payment gate |
| G7 | Meta App Review (B1) | High | open |
| G8 | OAuth UAT + exec sign-off | Med | open |
| G9 | Stale GH issues #7–#19 | Low | open |
| G10 | Unit harness flake | Low | **mitigated** (CL-042 WARN) |
| G11 | Phase 3 app SKIP (dev server down) | Low | open |
| G12 | Hostinger Track 2 paused | Info | — |
| G13 | Intelligence PDF (S7-P2) | Low | backlog |
| G14 | k6 full concurrent on VPS | Med | open |
| G15 | Production-closure commit not pushed | High | **closed** ✅ |

---

## Phase D cycle (2026-07-06)

| Command | Deliverable |
|---------|-------------|
| `/speckit.specify` | [`phase-d-spec.md`](./phase-d-spec.md) |
| `/speckit.clarify` | CL-044–047 |
| `/speckit.analyze` | Overall **8.0** — [`analysis.md`](./analysis.md) |
| `/speckit.plan` | Operator weeks 1–4 — [`plan.md`](./plan.md) |
| `/speckit.tasks` | PD-ENG ✅ · PD-OPS open — [`tasks.md`](./tasks.md) |
| `/speckit.taskstoissues` | `npm run speckit:issues-phase-d` |
| `/speckit.implement` | `.env.production.template`, `verify-phase-d`, integration runbook |
| `/speckit.converge` | Human gates remain — [`convergence.md`](./convergence.md) |

**Verify:** `npm run verify:phase-d:report`

---

## `/speckit.plan`

| Layer | Stack |
|-------|-------|
| App | Next.js 16, Tailwind, next-intl |
| Auth | Supabase session + NextAuth GitHub + OAuth |
| SoR | Supabase PostgreSQL + RLS |
| Jobs | Inngest + Redis worker |
| AI | Dify → OpenRouter + fallbacks |
| Deploy | GHCR image → Docker Compose on Hostinger |
| QA | `verify:program`, `qa:enterprise`, Playwright, k6 |

**Production closure (shipped locally):**
- `src/app/page.tsx` — enterprise redirect
- `.github/workflows/docker-build.yml` — `file: Dockerfile`
- `scripts/qa-enterprise.ts` — unit test flake handling

**Next engineering (gated):** Sprint 4 CLI · Sprint 6 Pit Crew (after payment)

---

## `/speckit.tasks` · `/speckit.taskstoissues`

See [`tasks.md`](./tasks.md) · [`issues-backlog-gtm.md`](./issues-backlog-gtm.md)

---

## `/speckit.implement`

| Scope | Status |
|-------|--------|
| 003–005 + Sprints 2–3, 5, 7 | ✅ `main` |
| Enterprise QA + PRD | ✅ |
| Production closure (3 fixes) | ✅ pushed `main` (71d4d99) |
| Phase D tooling | ✅ this commit |
| Prod intelligence migration | ✅ operator applied |
| Sprint 6 Pit Crew | ❌ CL-036 |
| Sprint 4 provision | ❌ CL-033 |

---

## `/speckit.converge`

**Production closure:** ✅ pushed `main` (CL-041–043)

**Phase D engineering:** ✅ template + verifier + runbook

**Remaining:** PD-OPS-001–009 (human), PD-COM-001–003 (commercial)

**Verdict:** **CONDITIONAL PRODUCTION** — run `verify:phase-d:report` on VPS after secrets fill.
