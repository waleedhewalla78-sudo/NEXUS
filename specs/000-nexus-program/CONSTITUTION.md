# Nexus Program Constitution (Speckit Canonical Summary)

**Version:** 1.3.0 · **Ratified:** 2026-06-23 · **Amended:** 2026-06-27  
**Full text:** [`nexus-social-app/CONSTITUTION.md`](../../nexus-social-app/CONSTITUTION.md)  
**Speckit memory:** [`nexus-social-app/.specify/memory/constitution.md`](../../nexus-social-app/.specify/memory/constitution.md)

---

## Governing principles (non-negotiable)

1. **SoR / SoI** — Agents propose; only reconciler + `secure-reconciler-writer` persist to Postgres.
2. **Risk tier > confidence** — CRITICAL/HIGH policy never auto-publishes on LLM score alone.
3. **003 isolation** — Do not break OAuth, publish worker, or `reconciler.ts` without regression proof.
4. **Dify = runtime, Inngest = orchestrator** — Not the reverse.
5. **202 + poll** — Long AI work never blocks HTTP.
6. **RLS on every tenant table** — Workspace/agency boundaries enforced before APIs.
7. **No standalone artifact apps** — External UI ideas adapt into Nexus APIs, auth, and agent mesh (Feature 005).
8. **Secrets never in repo** — `.env.example` documents keys only.

---

## Development guidelines

| Area | Rule |
|------|------|
| **Namespace 004** | New AI CMO code under `src/lib/ai-cmo/`, `src/lib/orchestration/`, `src/lib/observability/` |
| **Namespace analytics** | Paid media under `src/lib/analytics/` (005) |
| **Migrations** | Additive only; SQL Editor bundles for remote Supabase |
| **Before `[x]` task** | `typecheck` + `test` + schema verify + `build` |
| **UAT** | Live integration + Postman A/B before production sign-off |
| **Publishing** | Meta blocked until `meta_app_review_status = approved` |

---

## Amendment log (v1.3.0 — 2026-06-27)

| Change | Detail |
|--------|--------|
| **Inngest** | **Shipped** — A-GATE-001 satisfied in code; dev + production path documented |
| **Feature 005** | Product extensions integrate Claude *ideas* as Nexus APIs — not embedded artifacts |
| **UAT schema** | `auto_rejected` + eval columns required in Supabase |
| **audit_logs** | Required for reconciler audit trail (see UAT audit SQL) |

---

## Authority order

1. This constitution  
2. Feature `clarifications.md` (recorded decisions)  
3. Feature `spec.md`  
4. Master PRD v3 (historical FR inventory)
