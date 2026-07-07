# Program Tasks — Phase D Focus

**Updated:** 2026-07-06 (Phase D Speckit cycle)  
**Spec:** [`phase-d-spec.md`](./phase-d-spec.md) · **Integration:** [`docs/OPS-PHASE-D-INTEGRATION.md`](../../nexus-social-app/docs/OPS-PHASE-D-INTEGRATION.md)

---

## Done ✅

- [x] 003–005 core platform + Sprint 2–7
- [x] Production closure CL-041–043 pushed `main`
- [x] QA harness **0 FAIL**
- [x] Prod DB: intelligence + enterprise_leads
- [x] **PD-ENG-001** `.env.production.template`
- [x] **PD-ENG-002** `verify-phase-d-gates.ts` + npm scripts
- [x] **PD-ENG-003** `OPS-PHASE-D-INTEGRATION.md` (alternatives matrix)
- [x] **PD-ENG-004** `phase-d-spec.md` requirements + user stories

---

## P0 — Operator (human gates)

| Task | Owner | Verify |
|------|-------|--------|
| **PD-OPS-001** Hermes deploy latest `main` | DevOps | `verify:phase-d --live` health PASS |
| **PD-OPS-002** Fill `.env.production` from template | DevOps | B4 keys SET in `verify:phase-d` |
| **PD-OPS-003** Inngest Cloud sync `/api/inngest` | DevOps | `verify:inngest-cloud` |
| **PD-OPS-004** Confirm `nexus-social-worker` running | DevOps | `docker compose ps` |
| **PD-OPS-005** B2 OAuth — connect LinkedIn + X on live URL | QA | T053 in UAT-SIGNOFF |
| **PD-OPS-006** B1 Meta App Review submission | Product | `OPS-META-APP-REVIEW.md` |
| **PD-OPS-007** B1 set `meta_app_review_status=approved` | Product | B1-db PASS |
| **PD-OPS-008** B3 executive sign-off names | Leadership | UAT-SIGNOFF-RESULTS.md |
| **PD-OPS-009** `qa:enterprise:report` vs live URL | QA | Phase 3 PASS |

---

## P1 — Commercial (gated)

| Task | Owner | Gate |
|------|-------|------|
| **PD-COM-001** `generate:pilot-report` on prod workspace | Founder | S5 |
| **PD-COM-002** Signed pilot → `provision-pilot-client.ts` | Eng | CL-033 |
| **PD-COM-003** Client #1 payment | Founder | S6-PAY |
| **PD-COM-004** Pit Crew `/admin` | Eng | CL-036 after payment |

---

## Verify

```powershell
npm run verify:phase-d
npm run verify:phase-d:report    # --live --report
npm run qa:enterprise:report
powershell -File scripts/close-section-b.ps1
```
