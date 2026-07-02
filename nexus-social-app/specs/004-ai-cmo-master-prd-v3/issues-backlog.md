# Feature 004 — GitHub Issues Backlog (not in first batch of 30)

**Created:** 2026-06-23  
**Run first:** `scripts/create-github-issues-from-tasks.ps1` (priority batch)  
**Sources:** `IMPLEMENT_PLAN_ALL_OPEN.md`, `tasks.md`

## Partial / soak (create after batch 1)

| ID | Status | Notes |
|----|--------|-------|
| S14-T003 | Partial | Production soak for marketing event worker |
| S14-T005 | Partial | Memory repo — needs 000013 applied |
| S14-T006 | Partial | FinOps runtime — outcome job missing |
| S14-T007 | Partial | Attribution — in batch as separate if not created |
| B-ORCH-004 | Partial | Worker consumers — soak test |
| B-ORCH-006 | Partial | Redis DLQ vs Inngest failed_jobs table |
| C-MEM-002 | Partial | MemoryRepository hardening |
| C-MEM-004 | Partial | Optimizer loop |
| D-FIN-002 | Partial | Agent cost middleware |
| D-FIN-003 | Partial | Pre-flight budget |
| E-GOV-007 | Partial | Confidence persist coverage |

## Phase B

| ID | Task |
|----|------|
| B-ORCH-005 | Event bus → orchestration bridge (may be in batch) |
| B-ORCH-006 | Failed job persistence / admin API |

## Phase C

| ID | Task |
|----|------|
| C-MEM-002 | MemoryRepository production hardening |
| C-MEM-005 | Qdrant learning index (optional L3) |
| C-MEM-006 | Strategy history writes from Brain/Optimizer |

## Phase D

| ID | Task |
|----|------|
| D-FIN-002 | Agent cost middleware (complete) |
| D-FIN-003 | Pre-flight budget at orchestration step 0 |
| D-FIN-006 | Unified credit/cost reporting MV |
| S14-T007 | Attribution ingestion (if not issued) |

## Phase E (E-GOV)

| ID | Task |
|----|------|
| E-GOV-002 | Structured ContentPiece extraction |
| E-GOV-003 | Expand POLICY_RULES (MENA PDPL) |
| E-GOV-005 | 8-dimension schema extensions |
| E-GOV-006 | Cannibalization + EEAT gates |
| E-GOV-007 | Confidence persist on all campaigns |
| E-GOV-008 | Approval inbox UI (minimal) |

## Phase F (F-OBS)

| ID | Task |
|----|------|
| F-OBS-001 | OTel SDK (API + worker + agents) |
| F-OBS-002 | Langfuse integration |
| F-OBS-003 | Sentry agent error boundaries |
| F-OBS-005 | `/admin/ai-ops` dashboard |
| F-OBS-006 | Redis stream lag monitoring |
| F-OBS-008 | SLO alerting rules |

## Phase G (G-AGENT)

| ID | Task |
|----|------|
| G-AGENT-001 | Radar → event bus |
| G-AGENT-002 | Channel Risk heatmap API |
| G-AGENT-003 | Quant agent |
| G-AGENT-004 | Sentinel anomaly detection |
| G-AGENT-005 | Finance agent (Stripe pipeline) |
| G-AGENT-006 | Portfolio S&OP scenarios |

## Phase H (H-PROD)

| ID | Task |
|----|------|
| H-PROD-002 | Tenant/agency/brand UI |
| H-PROD-003 | White-label in explainability |
| H-PROD-005 | LAUNCH_CHECKLIST extension |
| H-PROD-006 | DR tabletop + Redis HA |
| H-PROD-007 | Load test 500 concurrent workspaces |
| H-PROD-008 | Production readiness sign-off |

## Sprint rollup tasks (tasks.md bundles)

| ID | Task |
|----|------|
| S15-T001–S15-T004 | External intel (Radar, Channel Risk, replanning) |
| S16-T001–S16-T005 | Governance & scale |
| S17-T001–S17-T005 | Productization UI & launch hardening |

## Feature 003 (optional `feature-003` label)

| ID | Task | Label notes |
|----|------|-------------|
| T024 | Playwright E2E publish path | `deferred`, `launch-uat` |
| T055 | Phase 2 analytics smoke | `launch-uat` |
| T056 | Full-stack walkthrough | `launch-uat` |

## Audit gap IDs (track as epics or sub-issues)

- Critical C1–C8 (except partial C5)
- High H1–H14 (except partial H14)
- Medium M1–M15, Low L1–L6 — see `architecture-audit/02-gap-analysis-matrix.md`

## Estimated remaining issue count

~52 open engineering/operator items after deduplication with priority batch (~30).
