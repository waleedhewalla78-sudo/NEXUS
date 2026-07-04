# Nexus Program — Full Speckit Cycle (Day 0 → Now)

**Date:** 2026-07-04  
**Workspace:** `nexus-social-app`  
**GitHub:** `waleedhewalla78-sudo/NEXUS` @ `main` (`e38d6f6`)  
**Prod:** `https://nexussocial.tech`  
**Verdict:** **AGENCY-READY CODE** — Sprint 6 **payment-gated**

**Test plan:** [`TEST-PLAN.md`](./TEST-PLAN.md) · **Runner:** `npm run verify:program`

---

## Timeline (day 0 → now)

| Era | Scope | Status |
|-----|-------|--------|
| **Day 0 / 003** | OAuth, publish, worker, analytics, Chatwoot | ✅ Code |
| **004** | 8-agent mesh, Inngest, policy, FinOps, memory | ✅ Code |
| **005 S18–19** | ABM, CRM webhooks, MENA, control plane | ✅ Code (`72f7b91`) |
| **Sprint 2** | Enterprise skin, `enterprise_leads`, `/enterprise` | ✅ Code (`3e795f2`) |
| **Sprint 3** | LinkedIn OAuth, Meta Lead Ads, integrations UI | ✅ Code (`60f7109`) |
| **Sprint 4** | Pilot provision script | ❌ Not built (sales gate) |
| **Sprint 5** | Case study simulation script | ✅ Code (`e38d6f6`) |
| **Sprint 6** | Pit Crew `/admin` + margins | 🔒 **Payment gate** |

---

## `/speckit.constitution`

**Canonical:** [`CONSTITUTION.md`](../../nexus-social-app/CONSTITUTION.md) **v1.4.0**

| Mandate | Rule |
|---------|------|
| SoR / SoI | Reconciler-only SoR writes |
| CL-030 | No `campaign-workflow` step order / `reconciler` validation changes |
| CL-029 | No Agency UI / `000014` without A-GATE-003 |
| GTM | High-touch pilots; no self-serve onboarding |
| Sprint 6 | Pit Crew Console only after Client #1 **payment** |

---

## `/speckit.specify` — Requirements & stories

### Built

- Omnichannel publish (FB/IG/LI/X), AI CMO mesh, ABM activate, CRM loop, MENA compliance
- Enterprise landing + leads APIs + Meta Lead Ads + feature flags
- GitHub NextAuth sign-in, LinkedIn connect UI, pilot ROI simulator

### Want (remaining)

| ID | Requirement | Gate |
|----|-------------|------|
| FR-OPS-01 | Hermes fully synced + secrets | Operator |
| FR-OPS-02 | `enterprise_leads` applied on prod | Operator |
| FR-S4-01 | `provision-pilot-client.ts` | Signed client |
| FR-S5-01 | Run `generate:pilot-report` on pilot WS | Pilot WS ID |
| FR-S6-01 | Pit Crew provision API + margins | **Payment** |
| FR-B1 | Meta publish App Review | Human |
| FR-S20 | Agency hierarchy | A-GATE-003 |

### User stories

| ID | Story | Status |
|----|-------|--------|
| US-001–011 | Publish, campaign, policy, budget | ✅ |
| US-026–031 | ABM / CRM / MENA | ✅ |
| US-040–043 | Leads, Meta ads, LinkedIn | ✅ code |
| US-050 | Pilot provision &lt;15 min | 🔒 S4/S6 |
| US-060 | Margin dashboard 55% gate | 🔒 S6 |

---

## `/speckit.clarify`

| ID | Decision |
|----|----------|
| CL-030–035 | Prior (workflow, agency, skin, Meta ads, high-touch, integrations) |
| **CL-036** | Sprint 6 Pit Crew **only after invoice paid** for Client #1 |
| **CL-037** | Sprint 4 provision script still optional if S6 API ships first (same outcome) |

---

## `/speckit.analyze` — Status & gaps

### Scores

| Track | Score | Notes |
|-------|-------|-------|
| Platform eng (003–005) | 8.5 | Shipped |
| GTM code (S2–3, S5) | 9.0 | On `main` |
| Live prod ops | 6.0 | Hermes/secrets/migration lag risk |
| Commercial (S4–6) | 2.0 | Sales/payment incomplete |
| **Overall agency** | **7.0** | Code ahead of revenue |

### Gaps / issues / incomplete (full list)

| # | Gap | Severity | Owner |
|---|-----|----------|-------|
| G1 | Hermes may lag `main` (`e38d6f6`) | High | DevOps |
| G2 | `enterprise_leads` may be missing on prod DB | High | DevOps |
| G3 | LinkedIn / NextAuth / OpenRouter secrets on VPS | High | DevOps |
| G4 | Sprint 4 provision script never written | Med | Eng (after sale) |
| G5 | Sprint 6 Pit Crew not built | Med | Eng (after pay) |
| G6 | Section B Meta **publish** review | High for FB/IG publish | Product |
| G7 | Live OAuth UAT T053–T056 unsigned | Med | QA |
| G8 | Exec sign-off names empty | Med | Leadership |
| G9 | GitHub issues #7–#19 stale open | Low | Eng |
| G10 | No `agency_client_roster` table | Low | Sprint 6 |
| G11 | Authenticated Playwright settings flake | Low | Eng |
| G12 | Hostinger Track 2 paused (DEC-006) | Info | — |

### Consistency

Code ↔ Sprint 2/3/5 specs: **aligned**. Live prod ↔ `main`: **verify Hermes**. Speckit tasks ↔ Sprint 6: **intentionally blocked**.

---

## `/speckit.plan` — Tech + tests

Stack: Next.js 16 · Supabase · Inngest · Redis/Upstash · Dify/OpenRouter · Docker/Hostinger.

**Full test scripts:** [`TEST-PLAN.md`](./TEST-PLAN.md)

```powershell
npm run verify:program          # Tier A
npm run verify:program:live     # Tier A + B
npm run generate:pilot-report   # Tier D (needs PILOT_WORKSPACE_ID)
```

Sprint 6 design (when unblocked): migration `agency_client_roster`, `POST /api/admin/provision-client`, `/admin/margins`, protect `/admin` with `x-admin-secret` = `INTERNAL_TOOL_SECRET`.

---

## `/speckit.tasks`

See [`tasks.md`](./tasks.md).

---

## `/speckit.taskstoissues`

See [`issues-backlog-gtm.md`](./issues-backlog-gtm.md). Sprint 6 issues stay **blocked** until payment.

---

## `/speckit.implement`

| Scope | Status |
|-------|--------|
| S2–S3, S5, ops docs, verify:program | **Done** this cycle |
| S4 provision script | Deferred (sale) |
| S6 Pit Crew | **Not implemented** (CL-036 payment gate) |

---

## `/speckit.converge`

| Dimension | Verdict |
|-----------|---------|
| Spec vs code through S5 | Aligned |
| Commercial path | Founder-owned |
| Next eng unlock | **"Sprint 6 Ready"** after payment |

Appended remaining: G1–G12, S6-ENG-*, S4-ENG-001.
