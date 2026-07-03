# Performance SLA

**Product:** Nexus Social Platform  
**Updated:** 2026-07-03  
**Environment:** Hostinger 8GB VPS · Caddy · Supabase · Upstash · Cloud LLM

---

## Agent Latency Targets (p95)

| Agent / Step | Target (p95) | Notes |
|--------------|--------------|-------|
| **Strategic Brain** (Cloud LLM) | **< 5s** | Dify / OpenRouter; no local Ollama in production |
| **Creator** (Cloud LLM) | **< 8s** | Includes JSON parse + quality pre-check |
| **Reconciler** (DB Write) | **< 1s** | Single SoR upsert via reconciler path |

Measure via OTel spans (`withAiCmoSpan`) and Inngest step duration metrics.

---

## Infrastructure Rules (Hostinger VPS)

| Rule | Target | Enforcement |
|------|--------|-------------|
| **API Routes** | p95 **< 500ms** | Exclude LLM-bound routes (`/api/v1/ai-cmo/campaigns` async 202) |
| **Container RAM** | Hard cap **3GB** | Docker `deploy.resources.limits.memory: 3g` — OOM kill if exceeded |
| **Worker processing** | No item **> 5 minutes** in queue | Redis job TTL + worker heartbeat monitoring |

---

## Related constraints

- **No local Redis / Postgres / Ollama** on VPS — Upstash, Supabase, cloud LLM only
- **Reverse proxy:** Caddy (SSL termination + route to Nexus container)
- **Deploy orchestrator:** Hermes AI (SSH), not GitHub Actions CI/CD

See also: [`OPS-PROD-CUTOVER.md`](./OPS-PROD-CUTOVER.md) · [`GATES-REMAINING.md`](./GATES-REMAINING.md)
