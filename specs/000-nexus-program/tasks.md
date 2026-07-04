# Program Tasks — Day 0 → Now

**Updated:** 2026-07-04  
**Cycle:** [`SPECKIT-CYCLE.md`](./SPECKIT-CYCLE.md) · **Tests:** [`TEST-PLAN.md`](./TEST-PLAN.md)

---

## Done ✅

- [x] 003 production baseline
- [x] 004 AI CMO mesh
- [x] 005 Sprint 18–19 ABM/CRM/MENA
- [x] Sprint 2 enterprise skin + LMM leads
- [x] Sprint 3 LinkedIn + Meta Lead Ads + integrations UI
- [x] Sprint 5 `generate:pilot-report`
- [x] `npm run verify:program` (Tier A orchestrator)

---

## Operator P0

- [ ] **G1** Hermes pull through `e38d6f6` + rebuild
- [ ] **G2** Apply `20260705_enterprise_leads.sql` on prod
- [ ] **G3** LinkedIn, NextAuth, OpenRouter secrets on VPS
- [ ] **G7** OAuth UAT T053–T056
- [ ] **G8** Exec sign-off names

---

## Commercial (founder)

- [ ] **S4-SALES** Close / onboard pilot (if not done)
- [ ] **S5-OPS** Run `generate:pilot-report` with pilot workspace ID
- [ ] **S6-PAY** Invoice Client #1 and receive payment

---

## Eng blocked

- [ ] **S4-ENG-001** `provision-pilot-client.ts` — after signed client
- [ ] **S6-ENG-001** Migration `agency_client_roster`
- [ ] **S6-ENG-002** `POST /api/admin/provision-client`
- [ ] **S6-ENG-003** `/admin/margins` + API (55% gate)
- [ ] **S6-ENG-004** Protect `/admin` with `x-admin-secret`

**Unlock S6:** reply **Sprint 6 Ready** after payment.

---

## Backlog

- [ ] Close GitHub #7–#19
- [ ] Meta App Review (publish)
- [ ] Sprint 20 / A-GATE-003
- [ ] Authenticated Playwright settings reliability

---

## Verify

```powershell
npm run verify:program
npm run verify:program:live   # optional
```
