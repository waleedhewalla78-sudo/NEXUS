# Feature 004 — AI CMO Enterprise (Quickstart)

**Status:** Phase 0 foundation stub  
**Active Speckit track:** Feature 003 remains active — see `.specify/feature.json` (`specs/003-real-integrations-production`).

## Relationship to Feature 003

Feature **004 extends 003**. It does not replace OAuth, publish workers, analytics ingestion, or schema automation.

| Layer | Feature 003 (baseline) | Feature 004 (additive) |
|-------|------------------------|-------------------------|
| L7 Execution | Publish worker, OAuth, `posts` SoR | Campaign → `post_id` link via reconciler |
| L3 Orchestration | Redis BRPOP (inbox, publish, analytics) | **Inngest** (`ai-cmo/*` events) |
| L6 Agents | Dify tool proxies | Strategic Brain, Creator (Dify runtime only) |
| Security | RLS, token vault | Rate-limited `ai_cmo_*` reconciler wrapper |

**Regression rule:** Do not modify `specs/003-*` or 003 core publish/OAuth paths except via documented 004 bridge tasks (e.g. S14-T002).

## Phase 0 foundation (pre-stubbed)

Phase 0 hardens 004 before Sprint 14 closed-loop work:

| Component | Path | Purpose |
|-----------|------|---------|
| Secure reconciler writer | `src/lib/ai-cmo/utils/secure-reconciler-writer.ts` | 100 writes/min per workspace on `ai_cmo_*` tables |
| Inngest client | `src/lib/orchestration/inngest-client.ts` | L3 orchestration (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`) |
| Inngest route | `src/app/api/inngest/route.ts` | App Router serve endpoint |
| Event types | `src/lib/orchestration/types/events.ts` | Zod schemas; `ai-cmo/` namespace |
| Langfuse client | `src/lib/observability/langfuse-client.ts` | PII-scrubbed agent traces |

## Install dependencies (when approved)

```bash
cd nexus-social-app
npm install inngest langfuse
```

Until installed, clients run in **stub mode** (501 on Inngest route; console stub for Langfuse).

## Environment variables

```env
# Inngest (004 L3)
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Langfuse (004 observability)
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

## Verify Phase 0

```powershell
cd nexus-social-app
npm run typecheck
npm test -- secure-reconciler langfuse events
```

## Next Speckit steps

1. Keep Feature 003 active until launch UAT complete.
2. When ready to switch Speckit to 004: update `.specify/feature.json` → `specs/004-ai-cmo-enterprise`.
3. Run `/speckit.plan` for Sprint 14 exit (S14-T002 campaign → post publish link).

## Canonical deep spec

Detailed PRD lives at [`nexus-social-app/specs/004-ai-cmo-master-prd-v3/spec.md`](../nexus-social-app/specs/004-ai-cmo-master-prd-v3/spec.md). This directory is the **Speckit bridge** for enterprise track initialization.
