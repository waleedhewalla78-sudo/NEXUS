# Phase 9 — Observability & AI Ops

**Date:** 2026-06-23 · **PRD Module:** N · **Target uptime:** 99.9% (8.76h/year max downtime)

---

## Observability Stack (Recommended)

| Layer | Tool | Purpose | Leadership decision |
|-------|------|---------|---------------------|
| Traces | **OpenTelemetry** (OTel) | Distributed traces across API → Inngest → agents → reconciler | Adopt (standard) |
| LLM observability | **Langfuse** | Prompt/completion logging, eval scores, cost correlation | **Approval recommended** |
| Errors | **Sentry** | Exceptions, performance issues (existing pattern likely) | Confirm existing setup |
| Metrics | Prometheus/Grafana or Vercel Analytics | RED metrics, SLO dashboards | Phase F |
| Logs | Structured JSON (pino/evlog pattern) | Correlation via trace_id | Align with Activepieces evlog patterns where shared |
| AI Ops UI | Custom `/admin/ai-ops` | Agent health, violations, spend | Sprint 16 |

---

## Langfuse Adoption Recommendation

**Recommend: Yes** — with OTel export bridge.

| Benefit | Detail |
|---------|--------|
| Prompt versioning | Track Brain/Creator prompt changes vs outcomes |
| Eval correlation | Link `ai_cmo_evaluations` to traces |
| Cost attribution | Token usage per trace (complements FinOps ledger) |
| Debug at scale | 5k workspaces — manual log grep insufficient |

| Risk | Mitigation |
|------|------------|
| SaaS data residency | Self-host Langfuse or scrub PII before send |
| Cost | Langfuse OSS self-host on existing infra |
| Duplicate with OTel | Langfuse OTel exporter; single instrumentation |

**Alternative if Langfuse rejected:** OTel + custom `ai_cmo_traces` table (higher build cost).

---

## OpenTelemetry Instrumentation Points

| Span name | Layer | Attributes |
|-----------|-------|------------|
| `api.ai-cmo.campaign.create` | L2 | workspace_id, user_id |
| `orchestration.campaign.step.{name}` | L3 | step, attempt, campaign_id |
| `agent.brain.plan` | L6 | model, tokens, latency_ms |
| `agent.creator.generate` | L6 | model, tokens |
| `policy.evaluate` | L4 | violations_count, risk_tier |
| `quality.evaluate` | L6 | overall_score |
| `reconciler.syncToSoR` | L7 | table, duration_ms |
| `memory.retrieve` | L5 | k, hit_count |
| `finops.recordCost` | L8 | amount_usd, agent |

**Propagation:** W3C tracecontext from API → Inngest (pass trace_id in event data) → agents.

---

## Sentry Integration

| Scope | Configuration |
|-------|---------------|
| Next.js API routes | Automatic error capture |
| Worker | Separate Sentry DSN or same project with `worker` tag |
| Agent failures | Capture model timeout, rate limit, parse errors |
| PII | Scrub captions before breadcrumb |

**Alert rules:**

- Reconciler error rate >1% / 5min → page
- Agent p95 latency >30s → warn
- Policy block spike >3× baseline → investigate

---

## AI Ops Dashboard Metrics

### Agent health

| Metric | Source | Alert threshold |
|--------|--------|-----------------|
| Agent success rate | Inngest + Langfuse | <98% |
| Agent p50/p95 latency | OTel | p95 >30s |
| Dify vs OpenRouter fallback rate | Agent wrapper | >20% (Dify unhealthy) |
| Token usage per hour | token_usage | Anomaly +3σ |

### Governance

| Metric | Source |
|--------|--------|
| Policy blocks / hour | policy-engine logs |
| Approval queue depth | ai_cmo_approval_requests |
| Approval SLA breaches | approval table |
| Auto-reject rate | ai_cmo_evaluations |

### FinOps

| Metric | Source |
|--------|--------|
| Spend vs budget | budget_policies + ledger |
| Top 10 costly workspaces | cost_summary MV |
| Cost anomaly | daily roll-up |

### Infrastructure

| Metric | Source |
|--------|--------|
| Worker heartbeat | Redis `worker:heartbeat` (existing) |
| Redis stream lag | XINFO GROUPS marketing:events |
| Inngest queue depth | Inngest dashboard |
| Supabase connection pool | Provider metrics |

---

## SLO Definitions

| SLO | Target | Measurement window |
|-----|--------|-------------------|
| API availability | 99.9% | 30d |
| Campaign workflow success | 99% | 7d |
| Agent p95 latency | <30s | 7d |
| Reconciler p99 | <100ms | 7d |
| Event processing lag | <60s | 24h |
| Data freshness (outcomes) | <6h | 24h |

**Error budget:** 99.9% = 43.8min/month — budget consumed by planned maintenance + incidents.

---

## Current State Gaps

| Capability | Status |
|------------|--------|
| OTel instrumentation | Not implemented in ai-cmo code |
| Langfuse | Not in package.json |
| Sentry on worker agent paths | Partial (console.error only) |
| AI Ops dashboard | Not built |
| Marketing event lag monitoring | Not built |
| Trace correlation API ↔ worker | Missing |

---

## Implementation Roadmap (Phase F)

1. Add OTel SDK to Next.js + worker
2. Leadership decision: Langfuse Cloud vs self-host
3. Instrument `campaign-workflow-deps` and agent wrappers
4. Sentry release tracking per deploy
5. Build `/admin/ai-ops` with TanStack Query on MVs + Langfuse API
6. On-call runbook links (doc 13)

---

## Sample Dashboard Layout (L1 Admin)

| Panel | Content |
|-------|---------|
| Overview | SLO status, error budget, active campaigns |
| Agents | Success/latency by agent, fallback rate |
| Governance | Blocks, approvals, violations |
| FinOps | Spend trend, cap warnings |
| Events | Stream lag, DLQ count |

See [16-production-readiness-assessment.md](./16-production-readiness-assessment.md) — observability is a launch gate.
