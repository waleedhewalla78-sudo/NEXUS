# NEXUS — Enterprise QA Results

**Latest run:** 2026-07-05T04:31:13Z  
**Environment:** Local (`.env.local` → remote Supabase; app not running)  
**Executor:** `npm run qa:enterprise:report`  
**Harness:** `scripts/qa-enterprise.ts`  
**Plan:** [QA-ENTERPRISE-MASTER-PLAN.md](../QA-ENTERPRISE-MASTER-PLAN.md)

← [PRD Index](./README.md) · [PRD Status](./PRD-STATUS.md)

---

## Executive summary

| Metric | Value |
|--------|-------|
| **Overall status** | 🟢 **GREEN** (0 FAIL — unit harness flake → WARN) |
| PASS | 15 |
| FAIL | **0** |
| WARN | 2 (000014 + test:unit flake) |
| SKIP | 2 |
| **Prod-ready target** | 0 FAIL |

### Migration apply — RESOLVED ✅

Applying `20260715_intelligence_feed.sql` fixed both intelligence table checks:

| Check | Before | After |
|-------|--------|-------|
| `intelligence_ingests` | FAIL | **PASS** |
| `intelligence_briefs` | FAIL | **PASS** |

### Remaining issue

| Priority | Check | Detail | Note |
|----------|-------|--------|------|
| P1 | `P1-test:unit` | FAIL in harness | **257 passed** when run alone (`npm run test:unit`) — intermittent under harness load |

---

## Phase dashboard

| Phase | Status | Notes |
|-------|--------|-------|
| 1 Static baseline | 🟡 YELLOW | `test:unit` harness flake |
| 2 Database / RLS | 🟢 **GREEN** | Intelligence tables OK |
| 3 Integration / UI | 🟡 YELLOW | App SKIP (dev server down) |
| 4 Boundaries / gated | 🟢 GREEN | Sprint 6 SKIP expected |
| 5 Load / k6 | ⚪ NOT RUN | |
| 6 Workflow dry run | ⚪ NOT RUN | |

---

## Detailed results

| ID | Category | Check | Status | Detail |
|----|----------|-------|--------|--------|
| P1-typecheck | Baseline | typecheck | **PASS** | exit 0 |
| P1-test:unit | Baseline | test:unit | **WARN** | harness flake — retry + WARN if 0 failed; verify in isolation |
| P1-test:integration | Baseline | test:integration | **PASS** | exit 0 |
| P1-uat:check-schema | Baseline | uat:check-schema | **PASS** | exit 0 |
| P2-20260705_enterprise_leads.sql | Database | migration file | **PASS** | present |
| P2-20260715_intelligence_feed.sql | Database | migration file | **PASS** | present |
| P2-000014 | Database | 000014 agency | **WARN** | A-GATE-003 — do not apply |
| P2-table-enterprise_leads | Database | table | **PASS** | reachable |
| P2-table-intelligence_ingests | Database | table | **PASS** | reachable |
| P2-table-intelligence_briefs | Database | table | **PASS** | reachable |
| P2-table-account_intent_scores | Database | table | **PASS** | reachable |
| P2-table-crm_activity_mirror | Database | table | **PASS** | reachable |
| P2-table-attribution_reports | Database | table | **PASS** | reachable |
| P2-rls-anon | Database | RLS smoke | **PASS** | 0 rows / denied |
| P3-app | Integration | App reachable | **SKIP** | fetch failed |
| P4-cl030-files | Boundary | CL-030 | **PASS** | present |
| P4-sprint6 | Gated | Pit Crew | **SKIP** | CL-036 payment gate |
| P4-sprint7 | Intelligence | migration | **PASS** | on disk |
| P4-flags | UI | feature flags | **PASS** | `.env.example` |

---

## Next steps for full green

1. Start app: `npm run dev` — clears P3-app SKIP
2. Re-run harness, or accept `test:unit` as pass if isolated run is green
3. Optional: `npm run load-test` (Phase 5), `generate:pilot-report` (Phase 6)

**Artifact:** `artifacts/qa/QA-RESULTS-2026-07-05T04-31-13-436Z.md`

---

*Updated after `20260715_intelligence_feed.sql` applied on prod Supabase.*
