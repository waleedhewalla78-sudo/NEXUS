# Phase D — Human & Commercial Gates Specification

**Speckit:** `/speckit.specify` (Phase D scope)  
**Date:** 2026-07-06  
**Integration guide:** [`docs/OPS-PHASE-D-INTEGRATION.md`](../../nexus-social-app/docs/OPS-PHASE-D-INTEGRATION.md)  
**Verifier:** `npm run verify:phase-d`

---

## Scope

Phase D closes the gap between **engineering-ready** (QA 0 FAIL, code on `main`) and **production-certified** (live OAuth, secrets, human approvals, first paying client).

Out of scope until commercial unlock: Sprint 4 provision CLI (CL-033), Sprint 6 Pit Crew (CL-036), migration `000014` (A-GATE-003).

---

## What we have built

| ID | Capability | Evidence |
|----|------------|----------|
| PD-BUILT-01 | OAuth flows Meta / LinkedIn / X / HubSpot | `src/lib/oauth/providers/*` |
| PD-BUILT-02 | Encrypted token vault | `TOKEN_ENCRYPTION_KEY` + `workspace_social_connections` |
| PD-BUILT-03 | Publish adapters FB/IG/LinkedIn/X | `src/lib/publishers/*` + `publish-due-posts.ts` |
| PD-BUILT-04 | Meta publish guard (App Review) | `meta_app_review_status` + worker check |
| PD-BUILT-05 | ProviderRouter Dify → OpenRouter | `src/lib/ai/providers/provider-router.ts` |
| PD-BUILT-06 | UAT scripts T053, Postman A/B | `uat:t053`, `uat:postman-ab` |
| PD-BUILT-07 | Section B automation | `close-section-b.ps1`, `verify:production:*` |
| PD-BUILT-08 | Production closure CL-041–043 | Pushed `main` 2026-07-05 |
| PD-BUILT-09 | Phase D gate verifier | `verify-phase-d-gates.ts` |
| PD-BUILT-10 | Prod env template | `.env.production.template` |
| PD-BUILT-11 | Intelligence + leads on prod DB | Migrations applied 2026-07-05 |

---

## What we want to build (requirements)

### B4 — Production secrets vault

| FR | Requirement | Acceptance |
|----|-------------|------------|
| FR-PD-B4-01 | All `${PROD_*}` vars in Hermes `.env.production` | `verify:phase-d` → 0 FAIL on B4 keys |
| FR-PD-B4-02 | `USE_LOCAL_OLLAMA=false` on VPS | G4-ollama-off PASS |
| FR-PD-B4-03 | Upstash `REDIS_URL` (not localhost) | B4 REDIS_URL SET |
| FR-PD-B4-04 | `DEMO_ANALYTICS_ENABLED=false` | No synthetic analytics in prod |

### G4 — LLM + auth + enterprise flags

| FR | Requirement | Acceptance |
|----|-------------|------------|
| FR-PD-G4-01 | `DIFY_API_KEY` or `OPENROUTER_API_KEY` configured | At least one SET |
| FR-PD-G4-02 | Inngest Cloud keys + sync | `verify:inngest-cloud` PASS |
| FR-PD-G4-03 | `NEXTAUTH_SECRET` + `NEXTAUTH_URL` | Auth sessions work on prod |
| FR-PD-G4-04 | Enterprise skin flags | `NEXT_PUBLIC_ENABLE_SaaS_UI=false` |

### B2 — Live OAuth UAT

| FR | Requirement | Acceptance |
|----|-------------|------------|
| FR-PD-B2-01 | Redirect URIs match `NEXT_PUBLIC_APP_URL` | `verify:phase-d` B2-redirect-* PASS |
| FR-PD-B2-02 | Active connections in DB per platform | T053 rows in `workspace_social_connections` |
| FR-PD-B2-03 | Scheduled post publishes via worker | Calendar status `published` |
| FR-PD-B2-04 | Analytics row after publish | T055 PASS |

### B1 — Meta App Review

| FR | Requirement | Acceptance |
|----|-------------|------------|
| FR-PD-B1-01 | Meta permissions approved in developer portal | Human checklist complete |
| FR-PD-B1-02 | `meta_app_review_status='approved'` on prod workspace | B1-db PASS |
| FR-PD-B1-03 | FB/IG publish succeeds end-to-end | T057 PASS |

### B3 — Executive sign-off

| FR | Requirement | Acceptance |
|----|-------------|------------|
| FR-PD-B3-01 | Product acceptance name + date | `UAT-SIGNOFF-RESULTS.md` |
| FR-PD-B3-02 | CTO / Engineering lead sign-off | Same doc |
| FR-PD-B3-03 | Compliance (MENA/PDPL) sign-off | Same doc |

### Commercial

| FR | Requirement | Acceptance |
|----|-------------|------------|
| FR-PD-S5-01 | Pilot case-study PDF on prod data | `generate:pilot-report` artifact |
| FR-PD-S4-01 | Provision first client workspace | After signed pilot (CL-033) |
| FR-PD-S6-01 | Pit Crew admin after Client #1 paid | CL-036 unlock |

---

## User stories

| ID | As a… | I want… | So that… | Acceptance |
|----|-------|---------|----------|------------|
| US-PD-01 | DevOps engineer | A prod env template with every required key | I can fill the vault without missing secrets | `.env.production.template` + checklist |
| US-PD-02 | DevOps engineer | `verify:phase-d` to report PASS/FAIL/HUMAN per gate | I know what blocks cutover before SSH | Script + optional `--live --report` |
| US-PD-03 | QA operator | Connect LinkedIn on live URL | I can publish without waiting for Meta | T053 LinkedIn PASS |
| US-PD-04 | Product manager | Submit Meta App Review with screencast | FB/IG publishing unlocks | B1 human checklist |
| US-PD-05 | CTO | Executive sign-off doc with engineering evidence | We certify production responsibly | B3 complete |
| US-PD-06 | Founder | Pilot PDF from prod workspace metrics | I can close first enterprise sale | S5 artifact |
| US-PD-07 | Agency admin | Pit Crew margins dashboard | I run multi-client ops | Blocked until S6-PAY |
| US-PD-08 | Marketing operator | Dify primary + OpenRouter fallback on prod | Campaigns survive provider outage | Campaign completes via fallback |
| US-PD-09 | Enterprise user | `/` redirects to `/intelligence` when SaaS off | GTM funnel works on prod | CL-041 live check |

---

## Integration alternatives summary

See [`OPS-PHASE-D-INTEGRATION.md`](../../nexus-social-app/docs/OPS-PHASE-D-INTEGRATION.md):

- **LLM:** Dify+OpenRouter (prod) · OpenRouter-only · Self-hosted Dify · Ollama (dev only)
- **Social:** Full (all platforms) · LinkedIn+X first · Sandbox dev OAuth
- **Commercial:** Pilot report → signed sale → provision CLI → payment → Pit Crew
