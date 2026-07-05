# 3. Goals & Success Metrics

← [PRD Index](./README.md) · [PRD Status](./PRD-STATUS.md) · [QA Results](./QA-RESULTS.md)

---

## 3.1 Business goals

| Goal | Metric | Target | Current status |
|------|--------|--------|----------------|
| G1 — Prove pilot ROI | Pipeline influenced ($) | ≥$150k per pilot | Script ready; run on prod WS |
| G2 — Convert to retainer | Monthly retainer | $5,000/mo Client #1 | **Not achieved** |
| G3 — GTM lead capture | Qualified inbound leads/mo | ≥1 from `/enterprise` | Endpoint live |
| G4 — Gross margin | `(retainer - llm) / retainer` | ≥55% | Sprint 6 dashboard blocked |
| G5 — Production readiness | Section B gates | B1–B6 PASS | B5/B6 local PASS |

---

## 3.2 Engineering KPIs

| KPI | Command | Acceptance |
|-----|---------|------------|
| Unit tests | `npm run test:unit` | ≥250 passed |
| Schema 003 | `npm run schema:verify` | 18/18 |
| Schema 004 | `npm run schema:verify:004` | 11/11 |
| Live integration | `npm run test:live-integration` | 5/5 |
| Postman UAT | `npm run uat:postman-ab` | A: 202→completed; B: budget block |
| E2E | `npm run test:e2e` | ≥23 pass |
| k6 smoke | `npm run load-test` | &lt;5% fail rate |
| Enterprise QA | `npm run qa:enterprise:report` | **0 FAIL** (current: 3 FAIL) |
| OAuth UAT | T053–T056 | Live publish per platform |
| Uptime target | `/api/health` | 99.9% at 5k workspaces |

---

## 3.3 Production-ready acceptance criteria

All must be true:

1. `npm run verify:program` → exit 0
2. `npm run qa:enterprise:report` → 0 FAIL
3. Migrations `20260705` + `20260715` applied on prod Supabase
4. Hermes at `befc0c3` + secrets per `OPS-PROD-SECRETS-CHECKLIST.md`
5. `UAT-SIGNOFF-RESULTS.md` signed (Product, Engineering, CTO)
6. Meta App Review approved **if** FB/IG publish required

---

*See also: [QA-RESULTS.md](./QA-RESULTS.md) · [16 Roadmap](./16-implementation-roadmap.md)*
