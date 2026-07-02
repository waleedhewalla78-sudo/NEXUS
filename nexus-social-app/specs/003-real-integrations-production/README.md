# Feature 003 — Real Integrations Production

**Status:** Launch-ready (Sprints 1–11 complete)  
**Last verified:** 2026-06-23

## Scope

Production OAuth (Meta, LinkedIn, X), real analytics sync, reputation/listening, AI agent webhooks, worker queue, and launch hardening. See [LAUNCH_CHECKLIST.md](../../LAUNCH_CHECKLIST.md) for go-live gates.

## Migrations

`supabase/migrations/20260623_000001` through `000010` — apply in order.

## Relationship to Feature 004

| Spec | Focus |
|------|--------|
| **003** (this) | Integrations launch — social publish, inbox AI, analytics, billing |
| **[004 — AI CMO Master PRD v3](../004-ai-cmo-master-prd-v3/spec.md)** | Enterprise AI CMO OS — orchestration, hierarchy, memory, FinOps |

Feature 004 builds on the 003 baseline. Sprint 12+ must not regress 003 behavior (OAuth, publish, worker, RLS on existing tables).
