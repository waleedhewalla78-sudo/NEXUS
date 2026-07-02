# Launch Readiness Checklist: Features 003 + 004

**Purpose:** Combined go-live gate for Nexus Social integrations launch (003) and AI CMO foundation (004)  
**Created:** 2026-06-24  
**Cross-reference:** [LAUNCH_CHECKLIST.md](../../../LAUNCH_CHECKLIST.md) · [003 README](../../003-real-integrations-production/README.md) · [004 spec.md](../spec.md)

---

## Success Criteria — Feature 003 (SC-001 – SC-010)

| ID | Criterion | Status | Verification |
|----|-----------|--------|--------------|
| SC-001 | TypeScript compiles with zero errors | **Pass** | `npm run typecheck` |
| SC-002 | Unit test suite green | **Pass** | `npm test` — 94/94 |
| SC-003 | Core schema tables present (18) | **Pass** | `npm run schema:verify` |
| SC-004 | Production build succeeds | **Pass** | `npm run build` |
| SC-005 | OAuth connect flow (LinkedIn/X) | **Manual** | LAUNCH_CHECKLIST §8 T053 |
| SC-006 | Schedule → publish worker path | **Manual** | LAUNCH_CHECKLIST §8 T053 |
| SC-007 | Meta publish gated until App Review | **Pass** | `meta_app_review_status` gate |
| SC-008 | Analytics truth (no demo fallback in prod) | **Manual** | LAUNCH_CHECKLIST §8 T055 |
| SC-009 | Worker heartbeat in Redis | **Manual** | `GET /api/health` → worker up |
| SC-010 | Staging preflight passes | **Partial** | `verify:staging` — blocked on Dify publish |

---

## Success Criteria — Feature 004 (PRD v3.0 Metrics)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Content output velocity | +500% | Not measured (Sprint 17) | Deferred |
| Time-to-campaign | < 15 min | Workflow stub completes in tests | **Partial** |
| Agent latency (p95) | < 30 s | Not instrumented | Sprint 17 (S17-T005) |
| Reconciler latency | < 100 ms | Unit tests only | Sprint 17 (S17-T005) |
| Policy violation rate | 0% | Policy engine enforced in workflow | **Pass** (code) |
| Schema 004 tables | 11/11 | 11/11 verified | **Pass** |
| SoR/SoI separation | Reconciler-only writes | Implemented | **Pass** |
| Zero 003 regression | No publish/OAuth changes | Verified | **Pass** |

---

## Automated Gates (run before any release)

- [x] LR-001 `npm run typecheck`
- [x] LR-002 `npm test`
- [x] LR-003 `npm run schema:verify`
- [x] LR-004 `npm run schema:verify:004`
- [x] LR-005 `npm run build`
- [ ] LR-006 `npm run ai:verify` (exit 0 — Dify published)
- [ ] LR-007 `npm run verify:staging` (includes ai:verify)
- [ ] LR-008 `npm run preflight` (full stack smoke)

---

## Database

- [x] LR-DB-001 Feature 003 migrations 000001–000010 applied
- [x] LR-DB-002 Feature 004 migration 000011 (hierarchy) applied
- [x] LR-DB-003 Feature 004 migration 000012 (foundation) applied
- [x] LR-DB-004 PostgREST schema cache reloaded

---

## Environment & Secrets

- [ ] LR-ENV-001 Production secrets configured (see LAUNCH_CHECKLIST §2)
- [ ] LR-ENV-002 `DEMO_ANALYTICS_ENABLED=false` in production
- [ ] LR-ENV-003 `TOKEN_ENCRYPTION_KEY` set when publishing enabled
- [ ] LR-ENV-004 OAuth redirect URIs match `{NEXT_PUBLIC_APP_URL}/api/oauth/*/callback`

---

## AI CMO Sprint 13 API

- [x] LR-AI-001 Campaign workflow API route registered
- [x] LR-AI-002 Confidence API route registered
- [x] LR-AI-003 Reconciler write path tested
- [ ] LR-AI-004 Dify Strategic Brain + Creator apps published
- [ ] LR-AI-005 End-to-end campaign POST against live Supabase (manual UAT)

---

## Launch Blockers (honest)

| Blocker | Owner | Feature | Status |
|---------|-------|---------|--------|
| Meta App Review | Business | 003 | Gate implemented; awaiting approval |
| Live OAuth UAT | Operator | 003 | Needs sandbox credentials |
| Dify app publish | Operator | 003/004 | `ai:verify` exit 2 until published |
| Inngest dependency | Engineering | 004 | Deferred Sprint 14 (CL-002) |
| AI CMO E2E | Engineering | 004 | Sprint 17 |

---

## Quick Reference

```powershell
cd D:\nexus-social-platform\nexus-social-app
npm run typecheck
npm test
npm run schema:verify
npm run schema:verify:004
npm run build
npm run ai:verify
```

Spec artifacts: `specs/004-ai-cmo-master-prd-v3/checklists/sprint13.md`
