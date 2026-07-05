# 19. Appendices

← [PRD Index](./README.md)

---

## Appendix A — Entity relationships

```text
workspaces 1──* workspace_members *──1 users
workspaces 1──* enterprise_leads
workspaces 1──* account_intent_scores
workspaces 1──* ai_cmo_campaigns 1──* ai_cmo_content_pieces
workspaces 1──* crm_activity_mirror
workspaces 1──* attribution_reports
workspaces 1──* intelligence_ingests
workspaces 1──* intelligence_briefs
workspaces 1──* ai_cmo_cost_ledger
account_intent_scores 0──1 enterprise_leads (abm_account_id)
```

---

## Appendix B — Environment variables (prod)

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| `NEXT_PUBLIC_ENABLE_SaaS_UI` | Yes |
| `NEXT_PUBLIC_ENABLE_ENTERPRISE_LANDING` | Yes |
| `GITHUB_ID` / `GITHUB_SECRET` | Yes |
| `LINKEDIN_CLIENT_ID` / `SECRET` | GTM |
| `META_WEBHOOK_SECRET` | Recommended |
| `OPENROUTER_API_KEY` | Optional |
| `TOKEN_ENCRYPTION_KEY` | If publish |
| `REDIS_URL` | Yes |
| `INNGEST_SIGNING_KEY` | Yes |
| `INTERNAL_TOOL_SECRET` | Sprint 6 |

Full list: `docs/OPS-PROD-SECRETS-CHECKLIST.md`

---

## Appendix C — Error handling

| Scenario | HTTP | Action |
|----------|------|--------|
| No session | 302 | Redirect login |
| Invalid lead | 400 | Show validation |
| Rate limited | 429 | Wait |
| Schema cache miss | 500 | Apply migration |
| Meta bad signature | 403 | Check secret |
| Budget exceeded | Job fail | Adjust cap |
| LLM failure | 200 fallback | Check OpenRouter |
| No ABM for pilot | exit 1 | `seed:abm-demo` |

---

## Appendix D — Testing reference

| Tier | Command |
|------|---------|
| Program verify | `npm run verify:program` |
| Unit | `npm run test:unit` |
| Integration | `npm run test:integration` |
| Live | `npm run test:live-integration` |
| E2E | `npm run test:e2e` |
| Auth E2E | `npm run test:e2e:auth` |
| Enterprise QA | `npm run qa:enterprise:report` |
| k6 | `npm run load-test` |

Plan: `specs/000-nexus-program/TEST-PLAN.md`

---

## Appendix E — Version history

| Date | Version | Change |
|------|---------|--------|
| 2026-07-04 | PRD 1.0.0 | Split topic docs + QA/STATUS |
| 2026-07-04 | Constitution 1.4.1 | Intelligence, QA, S6 gate |
| 2026-07-04 | Sprint 7 | Intelligence feed (`ebd6222`) |
| 2026-07-04 | QA | Harness (`befc0c3`) |
| 2026-07-03 | Sprint 5 | Pilot report (`e38d6f6`) |
| 2026-07-03 | Sprint 3 | GTM OAuth (`60f7109`) |
| 2026-07-02 | Sprint 2 | Enterprise skin (`3e795f2`) |
| 2026-07-03 | 005 | ABM/CRM (`72f7b91`) |

---

## Appendix F — Glossary

| Term | Definition |
|------|------------|
| ABM | Account-Based Marketing |
| CL-030 | Workflow/reconciler change lock |
| Diligent AI | Enterprise GTM brand skin |
| FinOps | Token cost + budget governance |
| GHCR | GitHub Container Registry |
| GTM | Go-to-market (landing, leads) |
| HITL | Human-in-the-loop approvals |
| Hermes | VPS operator deploy persona |
| Inngest | Workflow engine |
| LMM | Lead management module |
| MENA | Middle East & North Africa |
| Mesh | 8-agent AI CMO pipeline |
| Pit Crew | Sprint 6 admin console |
| RLS | Row-Level Security |
| SoI / SoR | Intelligence vs Record systems |
| Speckit | Spec-driven dev cycle |
| Section B | Production gates B1–B6 |

---

## Appendix G — Related documents

| Document | Path |
|----------|------|
| PRD Index | `docs/prd/README.md` |
| PRD Status | `docs/prd/PRD-STATUS.md` |
| QA Results | `docs/prd/QA-RESULTS.md` |
| Constitution | `CONSTITUTION.md` |
| Speckit cycle | `specs/000-nexus-program/SPECKIT-CYCLE.md` |
| Clarifications | `specs/000-nexus-program/clarifications.md` |
| Gates | `docs/GATES-REMAINING.md` |
| QA plan | `docs/QA-ENTERPRISE-MASTER-PLAN.md` |

---

## Appendix H — Key SQL migrations (apply order)

| Migration | Purpose |
|-----------|---------|
| `000001`–`000010` | 003 baseline |
| `000011`–`000012` | 004 AI CMO |
| `20260630_enterprise_abm_tables.sql` | ABM |
| `20260701_abm_playbook_runs.sql` | Playbooks |
| `20260705_enterprise_leads.sql` | Enterprise leads |
| `20260715_intelligence_feed.sql` | Intelligence |
| `000014` | **Do not apply** — A-GATE-003 |

After manual apply: `NOTIFY pgrst, 'reload schema';`
