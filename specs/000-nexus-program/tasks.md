# Program Tasks — Day 0 → Now

**Updated:** 2026-07-04 (post Sprint 7 + QA)  
**Cycle:** [`SPECKIT-CYCLE.md`](./SPECKIT-CYCLE.md)

---

## Done ✅

- [x] 003–005 core platform
- [x] Sprint 2–3 GTM (skin, leads, LinkedIn, Meta Lead Ads)
- [x] Sprint 5 `generate:pilot-report`
- [x] Sprint 7 Intelligence feed + briefing agent (`ebd6222`)
- [x] Enterprise QA master plan + `qa:enterprise` (`befc0c3`)
- [x] `verify:program` Tier A orchestrator

---

## Operator P0 (unblock prod)

- [ ] **G1** Hermes: `git pull` through `befc0c3`, rebuild
- [ ] **G2** Apply `20260705_enterprise_leads.sql`
- [ ] **G3** Apply `20260715_intelligence_feed.sql` ← **QA FAIL until done**
- [ ] **G4** Secrets: LinkedIn, NextAuth, OpenRouter, feature flags
- [ ] **G-QA** Re-run `npm run qa:enterprise:report` → target 0 FAIL

---

## Commercial

- [ ] Pilot sale / onboard (if needed)
- [ ] `PILOT_WORKSPACE_ID=… npm run generate:pilot-report`
- [ ] Invoice + **payment** Client #1

---

## Eng blocked

- [ ] **S4-ENG-001** `provision-pilot-client.ts` — after signed client
- [ ] **S6-ENG-001…004** Pit Crew Console — after **Sprint 6 Ready** (payment)
- [ ] **S7-P2** PDF download for briefs (optional)

---

## Backlog

- [ ] Meta App Review (publish)
- [ ] Close GH #7–#19
- [ ] A-GATE-003 / Sprint 20
- [ ] k6 full concurrent campaign profile on VPS

---

## Verify

```powershell
npm run verify:program
npm run qa:enterprise:report
```
