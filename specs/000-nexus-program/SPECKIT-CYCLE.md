# Nexus Program — Full Speckit Cycle

**Date:** 2026-07-04 (post Sprint 7 + Enterprise QA)  
**Workspace:** `nexus-social-app`  
**GitHub:** `waleedhewalla78-sudo/NEXUS` @ `main` (`befc0c3`)  
**Prod:** `https://nexussocial.tech`  
**Verdict:** **AGENCY + INTELLIGENCE CODE COMPLETE** — Sprint 6 **payment-gated**; prod migrations/ops lag

**Tests:** [`TEST-PLAN.md`](./TEST-PLAN.md) · `npm run verify:program` · `npm run qa:enterprise:report`  
**QA plan:** [`docs/QA-ENTERPRISE-MASTER-PLAN.md`](../../nexus-social-app/docs/QA-ENTERPRISE-MASTER-PLAN.md)

---

## Timeline (day 0 → now)

| Era | Deliverable | Commit / status |
|-----|-------------|-----------------|
| **003** | Publish, OAuth, worker, Chatwoot | ✅ Baseline |
| **004** | 8-agent mesh, Inngest, policy, FinOps | ✅ |
| **005 S18–19** | ABM, CRM, MENA, control plane | `72f7b91` |
| **Sprint 2** | Enterprise skin, `enterprise_leads`, `/enterprise` | `3e795f2` |
| **Sprint 3** | LinkedIn OAuth, Meta Lead Ads, integrations UI | `60f7109` |
| **Sprint 4** | Pilot provision CLI | ❌ Not built (sales) |
| **Sprint 5** | `generate:pilot-report` ROI sim | `e38d6f6` |
| **Sprint 6** | Pit Crew `/admin` + margins | 🔒 Payment (CL-036) |
| **Sprint 7** | Intelligence feed + briefing agent | `ebd6222` |
| **QA** | Enterprise master plan + harness | `befc0c3` |

---

## `/speckit.constitution` — v1.4.1

**Canonical:** [`CONSTITUTION.md`](../../nexus-social-app/CONSTITUTION.md)

| Principle | Rule |
|-----------|------|
| SoR / SoI | Reconciler-only SoR writes; intelligence uses **new** ingest helpers (not edit `reconciler.ts`) |
| CL-030 | No `campaign-workflow` step order / reconciler validation changes |
| CL-029 | No Agency UI / `000014` without A-GATE-003 |
| RAM | No native GA4/Meta/WhatsApp **sync workers** — funnel = CSV + webhooks |
| GTM | High-touch pilots; no self-serve onboarding |
| CL-036 | Sprint 6 Pit Crew only after Client #1 **payment** |
| QA | `npm run qa:enterprise` before claiming prod-ready |

---

## `/speckit.specify` — Built vs want

### Built

- Omnichannel publish, AI CMO mesh, ABM/CRM/MENA
- Enterprise landing, leads, Meta Lead Ads, feature flags, LinkedIn connect UI
- Pilot case-study simulator
- Intelligence: CSV ingest, anomalies, executive briefs, `/intelligence` feed, weekly Inngest cron
- Enterprise QA harness

### Want (remaining)

| ID | Requirement | Gate |
|----|-------------|------|
| FR-OPS-01 | Hermes pull `befc0c3` + rebuild | Operator |
| FR-OPS-02 | Apply `20260705` + `20260715` migrations on prod | Operator |
| FR-OPS-03 | LinkedIn / NextAuth / OpenRouter secrets | Operator |
| FR-S4-01 | `provision-pilot-client.ts` | Signed client |
| FR-S5-01 | Run pilot report on real WS | Pilot WS ID |
| FR-S6-01 | Pit Crew provision + margins | **Payment** |
| FR-B1 | Meta publish App Review | Human |
| FR-QA-01 | Green `qa:enterprise` after migrations | Ops |

### User stories

| ID | Story | Status |
|----|-------|--------|
| US-001–031 | Core platform + ABM/CRM | ✅ |
| US-040–043 | Leads, Meta ads, LinkedIn | ✅ code |
| US-070 | Upload CSV → intelligence feed | ✅ code |
| US-071 | AI executive brief (manual + Mon 09:00 UTC) | ✅ code |
| US-072 | Copy brief to clipboard | ✅ |
| US-050 / US-060 | Instant provision / margin dashboard | 🔒 S4/S6 |

---

## `/speckit.clarify`

| ID | Decision |
|----|----------|
| CL-030–037 | Prior (workflow, agency, skin, Meta ads, high-touch, payment, S4 vs S6) |
| **CL-038** | Sprint 7 = **funnel ingestion** (CSV/webhook), not native GA4/Meta/WhatsApp connectors |
| **CL-039** | Intelligence writes via `ingest-raw.ts` / service role — **do not** edit `secure-reconciler-writer.ts` |
| **CL-040** | Text-only Intelligence feed V1 — no chart libraries |

---

## `/speckit.analyze` — Status & gaps

### Scores

| Track | Score |
|-------|-------|
| Platform eng (003–005) | 8.5 |
| GTM + Intelligence (S2–3, S5, S7) | 9.0 |
| Live prod ops | 5.5 (migrations lag: intelligence tables missing on last QA run) |
| Commercial (S4–6) | 2.0 |
| **Overall** | **7.2** |

### Latest QA harness (`qa:enterprise:report`)

| Result | Count |
|--------|-------|
| PASS | 16 |
| FAIL | 3 (unit flake under load; intelligence tables not on remote DB) |
| WARN | 1 (`000014` present, do not apply) |
| SKIP | 2 (Sprint 6, partial app timeout) |

### Gaps G1–G14

| # | Gap | Severity |
|---|-----|----------|
| G1 | Hermes may lag `befc0c3` | High |
| G2 | `enterprise_leads` apply on prod | High |
| G3 | **`intelligence_*` tables not on prod** (QA FAIL) | High |
| G4 | LinkedIn / NextAuth / OpenRouter secrets | High |
| G5 | Sprint 4 provision CLI missing | Med |
| G6 | Sprint 6 Pit Crew missing | Med (gated) |
| G7 | Meta publish App Review | High for FB/IG publish |
| G8 | OAuth UAT / exec sign-off | Med |
| G9 | Stale GH issues #7–#19 | Low |
| G10 | Unit test flake under concurrent QA | Low |
| G11 | Authenticated Playwright settings | Low |
| G12 | Hostinger Track 2 paused | Info |
| G13 | PDF download for briefs (P2 Sprint 7) | Low |
| G14 | Full k6 concurrent campaign profile on VPS | Med |

---

## `/speckit.plan`

| Layer | Stack |
|-------|-------|
| App | Next.js 16, Tailwind |
| Auth | Supabase session + NextAuth GitHub + LinkedIn/Meta OAuth |
| SoR | Supabase + RLS |
| Jobs | Inngest (incl. intelligence briefing) |
| AI | Dify → OpenRouter + fallbacks |
| QA | `verify:program`, `qa:enterprise`, Playwright, k6 |

**Architecture (Intelligence):**  
CSV/JSON → `POST /api/v1/intelligence/ingest` → `intelligence_ingests` → Inngest/sync brief → `intelligence_briefs` → `/intelligence`

**Sprint 6 (when unlocked):** `agency_client_roster`, `POST /api/admin/provision-client`, `/admin/margins`, `x-admin-secret`.

---

## `/speckit.tasks` · `/speckit.taskstoissues`

See [`tasks.md`](./tasks.md) · [`issues-backlog-gtm.md`](./issues-backlog-gtm.md)

---

## `/speckit.implement`

| Scope | Status |
|-------|--------|
| Through Sprint 7 + QA harness | **Done** on `main` |
| Sprint 6 Pit Crew | **Not implemented** (CL-036) |
| Sprint 4 provision CLI | **Not implemented** (sales) |
| Apply prod migrations | **Operator** (not code) |

---

## `/speckit.converge`

Code through Sprint 7 is aligned with agency-led strategy. Remaining work is **ops (G1–G4)**, **commercial**, and **gated eng (S6)**.

**Next unlocks:** (1) Apply intelligence + leads migrations on prod → re-run `qa:enterprise:report`. (2) **Sprint 6 Ready** after payment.
