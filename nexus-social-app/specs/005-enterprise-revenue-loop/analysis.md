# Cross-Artifact Analysis — Nexus Social (Features 003 + 004 + 005)

**Date:** 2026-06-25 (`/speckit.analyze`)  
**Workspace:** `nexus-social-app`  
**Inputs:** Feature 005 specify/clarify, CONSTITUTION v1.3, PRE-DEPLOYMENT-CHECKLIST, ABM wiring session, verification run 2026-06-25

**Verification run (2026-06-25):**

```text
npm run test:unit        → 215 passed | 1 skipped (216)
npm run uat:check-schema → 12/12 OK (incl. ABM tables)
npm run verify:abm-seed  → PASS (5 accounts, 12 attribution, API 200)
npm run typecheck        → pass (prior session)
```

---

## 1. Executive Project Status (Whole Platform)

| Dimension | Feature 003 | Feature 004 | Feature 005 | Combined |
|-----------|-------------|-------------|-------------|----------|
| **Engineering gates** | Pilot-ready | Demo-ready + live integration 5/5 | Sprint 18 started | **Staging-ready** |
| **Human gates** | Meta Review, OAuth UAT open | Dify publish (S13-T012) | None new | **Production blocked** |
| **FR coverage** | N/A (US1–11) | ~40% partial+ (004 spec) | 0% → Sprint 18 target 25% | ~42% platform |
| **Tests** | In 216 suite | agent-mesh 5/5, integration 18/18 | TBD | **216 total** |
| **Schema** | 18/18 | 11/11 + ABM 3 tables | +1 pending (`abm_playbook_runs`) | **15+ ABM live** |
| **Enterprise narrative** | Publish truth | 8-agent mesh proven | ABM live API | **CTO-demo credible** |

### Launch readiness verdict (updated)

| Track | Score | Verdict |
|-------|-------|---------|
| **003 pilot UAT** | 8.0 | Engineering complete; Meta + OAuth human gates |
| **004 autonomous demo** | 7.0 | ↑ from 4.5 — live integration 5/5, Inngest, FinOps ledger |
| **004 production @ 5k ws** | 4.5 | Memory/Qdrant, agency hierarchy, OTel partial |
| **005 ABM enterprise demo** | 8.5 | Live DB + API; activation + control plane in Sprint 18 |
| **Combined go-live** | 7.0 | **Controlled enterprise pilot** OK; production needs Section B gates |

**Critical path (updated):** Meta App Review → OAuth UAT → **005 Phase I (activation + control plane)** → HubSpot webhook → MENA pack → Agency 000014

---

## 2. Cross-Artifact Consistency Matrix

| Artifact A | Artifact B | Consistent? | Notes |
|------------|------------|-------------|-------|
| 005 `spec.md` FR-056–59 vs ABM code | `accounts-query.ts`, API routes | **Yes** | Pre-005 wiring matches |
| 005 vs 004 `spec.md` | No duplicate FR IDs | **Yes** | 005 starts FR-056 |
| 004 `analysis.md` test count | Current repo | **No — stale** | Says 107; **actual 216** |
| 004 `README.md` FR % | Runtime today | **No — stale** | Mesh + live integration advanced |
| CONSTITUTION migrations table | ABM migration | **No — stale** | Missing `20260630_enterprise_abm_tables.sql` |
| PRE-DEPLOYMENT 210/210 | Current tests | **Minor drift** | 215/216 pass |
| 005 `clarifications` CL-023 vs constitution | Reuse campaign path | **Yes** | Aligns SoR/reconciler |
| `docs/004-PROJECT-CLOSED-V1.md` vs 005 work | New speckit session | **Yes** | Explicit new `/speckit.specify` authorized |
| ABM UI vs API | No demo fallback | **Yes** | Empty state only |
| Strategic assessment vs 005 spec | 5 recommendations | **Yes** | Mapped to Phases I–IV |

**Material drifts to fix:** 004 analysis test counts, CONSTITUTION migration list (documentation only — not blocking 005).

---

## 3. Requirements Coverage (005)

| Status | Count | IDs |
|--------|-------|-----|
| **Done (pre-005)** | 3 | US-026, US-027, US-028 |
| **Sprint 18 target** | 8 | FR-056–059, FR-064–065, NFR-013–014 |
| **Sprint 19 target** | 10 | FR-060–063, FR-066–069, NFR-015 |
| **Sprint 20 / blocked** | 3 | FR-070–072 (A-GATE-003) |

**005 FR coverage today:** **0/17 done** (spec only) · **3/10 US pre-complete**

---

## 4. Gap Analysis vs Strategic Assessment

| Strategic rec | 005 phase | Gap closed? |
|---------------|-----------|-------------|
| ABM Activation Engine | Phase I | **In progress** — schema + API + UI |
| CRM Revenue Closed-Loop | Phase II | Webhook + domain link pending |
| Agent Control Plane | Phase I | API + page in Sprint 18 |
| MENA Compliance Pack | Phase III | Sprint 19 |
| Agency Command Center | Phase IV | Blocked on 000014 |

---

## 5. Risk Register (005)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Activation spams campaigns | Med | Rate limit 10 activations/hr/workspace |
| CRM webhook forgery | High | HMAC verify (NFR-015, Sprint 19) |
| 004 regression | High | CL-030 boundary + test gates |
| API key empty ABM reads | Low | Fixed — service role for API key path |
| Agency scope creep | Med | CL-029 hard block |

---

## 6. Recommendations

1. **Complete Sprint 18 Phase I** before sales demos (activation + control plane).
2. **Refresh 004 analysis.md** test counts in docs pass (non-blocking).
3. **Run `verify:abm-seed`** in CI after migration apply.
4. **Open GitHub issues** from `tasks.md` for execution tracking.

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-06-25 | speckit.analyze | Initial 005 cross-artifact + platform status |
