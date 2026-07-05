# Program Tasks — Day 0 → Now

**Updated:** 2026-07-05 (post production closure + prod migrations)  
**Cycle:** [`SPECKIT-CYCLE.md`](./SPECKIT-CYCLE.md)

---

## Done ✅

- [x] 003–005 core platform
- [x] Sprint 2–3 GTM (skin, leads, LinkedIn, Meta Lead Ads)
- [x] Sprint 5 `generate:pilot-report`
- [x] Sprint 7 Intelligence feed + briefing agent
- [x] Enterprise QA master plan + `qa:enterprise`
- [x] PRD 1.0.1 + topic split (`docs/prd/`)
- [x] Apply `20260715_intelligence_feed.sql` on prod Supabase (2026-07-05)
- [x] QA harness green: **15 PASS · 0 FAIL** (2026-07-05)
- [x] Production closure — root redirect (CL-041)
- [x] Production closure — GHCR `file: Dockerfile` (CL-043)
- [x] Production closure — harness `test:unit` flake → WARN (CL-042)

---

## Operator P0 (deploy + certify)

- [ ] **G15** Commit + push production-closure to `main`
- [ ] **G1** Hermes: `git pull` + `docker compose pull && up -d`
- [ ] **G4** Secrets: LinkedIn, NextAuth, OpenRouter, feature flags
- [ ] **G11** Re-run `qa:enterprise:report` with `NEXT_PUBLIC_APP_URL=https://nexussocial.tech` (Phase 3)
- [ ] **B1–B3** Meta App Review, OAuth UAT, exec sign-off

---

## Commercial

- [ ] Pilot sale / onboard (if needed)
- [ ] `PILOT_WORKSPACE_ID=… npm run generate:pilot-report` on prod
- [ ] Invoice + **payment** Client #1 → **Sprint 6 Ready**

---

## Eng blocked

- [ ] **S4-ENG-001** `provision-pilot-client.ts` — after signed client
- [ ] **S6-ENG-001…004** Pit Crew Console — after payment
- [ ] **S7-P2** PDF download for briefs (optional)

---

## Backlog

- [ ] Close GH #7–#19
- [ ] A-GATE-003 / Sprint 20
- [ ] k6 full concurrent campaign profile on VPS
- [ ] A-GATE-002 Langfuse decision

---

## Verify

```powershell
npm run verify:program
npm run qa:enterprise:report   # target: 0 FAIL
npm run test:unit              # 257+ pass in isolation
```
