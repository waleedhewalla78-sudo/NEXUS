# Nexus Program — Full Speckit Cycle

**Date:** 2026-07-04  
**Workspace:** `e:\nexus-social-platform\nexus-social-app`  
**GitHub:** `waleedhewalla78-sudo/NEXUS` @ `main` (`60f7109`)  
**Production:** `https://nexussocial.tech` (Hermes / Hostinger)  
**Verdict:** **GTM-READY CODE** — Sprint 4 is **sales-gated** (no self-serve UI)

---

## Verification snapshot (this run)

```text
npm run typecheck        → PASS
npm run test:unit        → 250 passed | 1 skipped (prior Sprint 2/3 audit)
Git HEAD                 → 60f7109 (Sprint 3 integrations UI)
```

---

## `/speckit.constitution` — Governing principles

**Canonical:** [`nexus-social-app/CONSTITUTION.md`](../../nexus-social-app/CONSTITUTION.md) **v1.4.0**

| Area | Rule |
|------|------|
| **SoR / SoI** | Agents/Dify never write SoR; mutations via `reconciler.ts` + domain services |
| **Dify** | Runtime only; orchestration = Inngest + Redis Streams |
| **Multi-tenant** | RLS on every tenant table before API routes |
| **AI governance** | Risk tier + policy — never LLM confidence alone |
| **CL-030** | Do not change `campaign-workflow.ts` step order or `reconciler.ts` validation |
| **CL-029** | No Agency UI / Sprint 20 / `000014` without A-GATE-003 |
| **GTM pilots** | High-touch provision script only — **no self-serve onboarding UI** |
| **Enterprise skin** | `NEXT_PUBLIC_ENABLE_SaaS_UI=false` hides SaaS chrome; Integrations remains for OAuth |

---

## `/speckit.specify` — What we build / want to build

### Built (as-built on `main`)

| Track | Capabilities |
|-------|----------------|
| **003** | OAuth vault, publish FB/IG/LI/X, worker, analytics, Chatwoot, webhooks |
| **004** | 8-agent mesh, Inngest, policy, FinOps, memory, channel-risk, circuit breakers |
| **005 S18–19** | ABM activate, CRM webhooks, MENA compliance, control plane |
| **Sprint 2** | `enterprise_leads`, public `/enterprise`, lead form, flags, internal `/enterprise/leads` |
| **Sprint 3** | LinkedIn OAuth (prod-ready), Meta Lead Ads ingest, `/settings/integrations`, GitHub NextAuth sign-in |
| **Ops** | Runbooks, `verify:production:*`, Dockerfile `--legacy-peer-deps` |

### Want to build (remaining)

| Priority | Item | Owner | Gate |
|----------|------|-------|------|
| **P0** | Hermes deploy of Sprint 2–3 + LinkedIn secrets | DevOps | Human |
| **P0** | Apply `20260705_enterprise_leads.sql` on prod Supabase | DevOps | Human |
| **P0** | Sprint 4 Phase A — sell $3k pilot | Founder | Sales |
| **P1** | `scripts/provision-pilot-client.ts` | Eng | **Signed client only** |
| **P1** | Section B: Meta App Review (publish), OAuth UAT live | Product/QA | Human |
| **P2** | Sprint 20 agency / `000014` | Eng | A-GATE-003 |
| **P2** | HubSpot full OAuth polish, TikTok/Snap live publish | Eng | Backlog |

### User stories (selected)

| ID | Story | Status |
|----|-------|--------|
| US-001 | Operator publishes via worker | ✅ |
| US-002 | AI campaign 202 + poll | ✅ |
| US-026–031 | ABM + CRM + MENA | ✅ |
| US-040 | Visitor submits lead on `/enterprise` | ✅ code (needs table applied) |
| US-041 | Operator lists leads | ✅ |
| US-042 | Meta Lead Ads → `enterprise_leads` | ✅ code |
| US-043 | Connect LinkedIn in prod settings | ✅ code (needs secrets + Hermes) |
| US-050 | Pilot tenant provisioned in &lt;1 day after signature | 🔒 Sprint 4 sales |

---

## `/speckit.clarify` — Resolved ambiguities

| ID | Decision |
|----|----------|
| **CL-030** | No campaign-workflow / reconciler validation changes |
| **CL-029** | Agency / `000014` blocked |
| **CL-031** | Enterprise skin via env flags — not a separate app |
| **CL-032** | Meta Lead Ads ingest does **not** require Meta App Review (B1 is publish-only) |
| **CL-033** | Pilot onboarding = service-role script + manual `workspace_members` — **no self-serve UI** |
| **CL-034** | Sprint 4 Loop 1 (provision script) runs **only after signed client** |
| **CL-035** | Integrations URL is `/settings/integrations` (SettingsHub); workspace bootstrap always on for OAuth |

Open (non-blocking): OQ-004–006 (Postman concurrency, import persistence, calendar drafts).

---

## `/speckit.analyze` — Cross-artifact & project status

### Whole-platform scores

| Track | Score | Verdict |
|-------|-------|---------|
| 003 publish baseline | 8.0 | Eng complete; Meta publish still B1 |
| 004 AI CMO demo | 7.5 | Live mesh proven |
| 005 ABM enterprise | 9.0 | Sprint 18–19 shipped |
| Sprint 2–3 GTM code | 9.0 | On `main`; Hermes/secrets ops remain |
| Sprint 4 lighthouse | 0.0 eng / sales | **Blocked on signed pilot** |
| **Combined GTM** | **8.2** | **Ready to sell**; provision script deferred |

### Consistency

| Pair | Status |
|------|--------|
| Spec vs code (S2–S3) | ✅ Aligned |
| Constitution v1.4 vs GTM | ✅ Updated this cycle |
| Live prod vs `main` | ⚠️ Hermes pull + secrets may lag |
| `enterprise_leads` migration file vs prod DB | ⚠️ Apply in SQL Editor if not done |
| GitHub issues #7–#19 | ⚠️ Stale open labels vs shipped work |

### Critical path

1. Confirm Hermes `git pull` through `60f7109`  
2. Inject `LINKEDIN_CLIENT_*`, `NEXTAUTH_*`, feature flags  
3. Apply `enterprise_leads` migration  
4. Founder sells pilot (Sprint 4 Phase A)  
5. Run provision script (Loop 1) only after signature  

---

## `/speckit.plan` — Technical plan

| Layer | Stack |
|-------|-------|
| App | Next.js 16, Tailwind |
| Auth | Supabase session + NextAuth GitHub (navbar) + LinkedIn/Meta OAuth for publish |
| SoR | Supabase Postgres + RLS |
| Jobs | Inngest + Redis |
| AI | Dify → OpenRouter + circuit breakers |
| Deploy | Docker on Hostinger; Upstash Redis; no local Ollama on VPS |

### Phase map

| Phase | Status |
|-------|--------|
| 003–005 core + Sprint 18–19 | ✅ |
| Sprint 2 enterprise skin + LMM | ✅ code |
| Sprint 3 GTM OAuth + Meta leads | ✅ code |
| Sprint 3 Hermes secrets | ⬜ operator |
| Sprint 4 provision script | 🔒 after sale |
| Sprint 20 agency | 🔒 A-GATE-003 |

---

## `/speckit.tasks` — Actionable lists

See [`tasks.md`](./tasks.md).

**Automated eng (done):** S2–S3 code on `main`.

**Human / ops (open):** Hermes deploy, LinkedIn secrets, migration apply, UAT signatures, Meta App Review.

**Blocked eng:** `P004-PILOT-T001` provision script — **do not implement until `CLIENT_NAME` provided**.

---

## `/speckit.taskstoissues` — GitHub mapping

| Issue / ID | Title | Status |
|------------|-------|--------|
| #7–#19 | Sprint 18–19 backlog | Shipped — close via script (except historical #14 if still open) |
| **S3-OPS-001** | Hermes pull + LinkedIn secrets | Open (operator) |
| **S3-OPS-002** | Apply `enterprise_leads` on prod | Open (operator) |
| **S4-SALES-001** | Close $3k pilot | Open (founder) |
| **S4-ENG-001** | `provision-pilot-client.ts` | Blocked on S4-SALES-001 |

Backlog file: [`issues-backlog-gtm.md`](./issues-backlog-gtm.md)

---

## `/speckit.implement` — Execution status

| Scope | Status |
|-------|--------|
| Sprint 2–3 features | **IMPLEMENTED** on `main` (`3e795f2`…`60f7109`) |
| Sprint 4 provision script | **NOT IMPLEMENTED** (sales gate CL-034) |
| Self-serve onboarding UI | **OUT OF SCOPE** (constitution) |

CL-030 respected across Sprint 2–3.

---

## `/speckit.converge` — Assessment

| Dimension | Verdict |
|-----------|---------|
| Spec vs code (through S3) | Aligned |
| Plan vs execution | Hermes/ops lag only |
| Sprint 4 | Sales phase — eng idle by design |
| Remaining tasks | Appended in `tasks.md` / `convergence.md` |

**Risks:** Prod migration not applied → lead APIs 500; missing LinkedIn secrets → Connect OAuth fails; selling before Hermes verify → demo risk.

---

## Command index

| Command | Artifact |
|---------|----------|
| constitution | `CONSTITUTION.md` v1.4.0 |
| specify / clarify / analyze / plan | This file + `spec.md` / `clarifications.md` |
| tasks | `tasks.md` |
| taskstoissues | `issues-backlog-gtm.md` |
| implement | `main` @ `60f7109` (S4 deferred) |
| converge | `convergence.md` |
