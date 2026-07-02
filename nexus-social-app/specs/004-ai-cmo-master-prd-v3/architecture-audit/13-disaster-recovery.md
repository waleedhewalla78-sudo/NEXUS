# Phase 12 — Disaster Recovery & Business Continuity

**Date:** 2026-06-23 · **PRD Module:** M · **Target uptime:** 99.9%

---

## Recovery Objectives

| Tier | RPO | RTO | Scope |
|------|-----|-----|-------|
| **Tier 1 — Critical** | 15 min | 1 hour | Supabase Postgres (SoR), Redis (queues), auth |
| **Tier 2 — Important** | 1 hour | 4 hours | Inngest state, Qdrant vectors |
| **Tier 3 — Degraded OK** | 24 hours | 24 hours | Langfuse traces, MV refresh lag |

**RPO** = max acceptable data loss · **RTO** = max acceptable downtime

---

## Component Failover Matrix

| Component | Primary | Failover | Current state |
|-----------|---------|----------|---------------|
| Postgres (Supabase) | Supabase managed | Point-in-time recovery (PITR) | Depends on Supabase plan |
| Redis | Single instance | Redis Sentinel / Elasticache Multi-AZ | **Single REDIS_URL** — SPOF |
| Next.js app | Vercel / Docker | Multi-region deploy | docker-compose.full-stack.yml exists |
| Worker | `src/bin/worker.ts` | Second worker instance + consumer group | Single process loops |
| Dify | Self-host / cloud | OpenRouter fallback | ✓ implemented in agents |
| OpenRouter | SaaS | Secondary ModelProvider | **Not implemented** |
| Qdrant | Self-host | Rebuild from Postgres + re-embed | RAG ingest recoverable |
| Inngest | Cloud | Replay from DLQ | Not installed yet |

---

## Circuit Breakers (Sprint 16 — Required before scale)

**Path:** `src/lib/resilience/circuit-breaker.ts`

| Service | Open threshold | Half-open | Action |
|---------|----------------|-----------|--------|
| Dify API | 5 failures / 60s | 1 probe | OpenRouter fallback |
| OpenRouter | 3 failures / 60s | 1 probe | Queue job + alert |
| Supabase write | 3 failures / 30s | 1 probe | Fail workflow, DLQ |
| Redis | 3 failures / 30s | 1 probe | In-memory bus (degraded) |

**Constitution Module M:** Deferred to Sprint 16 — **elevated to Phase F gate** per this audit.

---

## Backup Strategy

| Data | Method | Frequency | Retention |
|------|--------|-----------|-----------|
| Postgres | Supabase automated + manual pre-migration | Continuous PITR | 7–30 days per plan |
| Redis streams | AOF + periodic RDB | Hourly snapshot | 24h (events replay from DLQ) |
| Qdrant | Snapshot API | Daily | 7 days |
| Langfuse | Self-host Postgres backup | Daily | 30 days |
| Audit logs | Postgres + archive S3 | Continuous | 7 years enterprise |

---

## Runbooks

### RB-001 — Supabase outage

1. Confirm via `/api/health` + Supabase status page  
2. Enable maintenance mode banner (L1)  
3. Worker: pause publish loops (SIGUSR1 handler — **to implement**)  
4. Queue campaigns in Inngest (durable) — drains on recovery  
5. RTO clock starts; escalate if >1h  
6. Post-incident: verify reconciler idempotency, replay DLQ  

### RB-002 — Redis outage

1. Event bus falls back to in-memory (current code) — **single instance only**  
2. Worker heartbeat fails → health `down`  
3. Failover to Redis replica or restart  
4. Replay `marketing:events` from last ACKed ID if persistent stream intact  
5. Verify idempotency keys prevent duplicate replans  

### RB-003 — Dify + OpenRouter both down

1. Circuit breakers open  
2. Campaign workflows → DLQ with status `deferred_ai`  
3. Notify operators; Creator/Brain unavailable  
4. Publish path for existing drafts unaffected (003)  

### RB-004 — Inngest outage

1. API returns 503 on campaign create; client retries  
2. Redis stream buffers events  
3. Manual replay via Inngest dashboard on recovery  

### RB-005 — Data residency incident (PDPL)

1. Identify affected workspace tenant region  
2. Stop AI processing for region  
3. Execute erasure job on memory tables + Qdrant collection  
4. Document in audit_logs  

---

## Multi-Region (Enterprise Future)

| Region | Components |
|--------|------------|
| UAE (me-central) | App edge, inference routing, Postgres read replica |
| EU | GDPR workloads |
| US | Default |

Requires `tenants.data_region` routing (doc 12).

---

## DR Testing

| Test | Frequency | Success criteria |
|------|-----------|------------------|
| Postgres restore drill | Quarterly | RTO <1h validated |
| Redis failover | Monthly | Event bus resumes <5min |
| DLQ replay | Monthly | 100% idempotent |
| Full tabletop | Semi-annual | Runbooks updated |

**Current:** No DR tests documented; no maintenance mode; single Redis SPOF.

---

## 99.9% Uptime Budget

| Risk | Annual hours | Mitigation |
|------|--------------|------------|
| Planned maintenance | 4h | Off-peak window |
| Supabase incident | 2h | PITR + status monitoring |
| Redis SPOF | 2h | Sentinel |
| Deploy errors | 0.5h | Canary + rollback |
| **Buffer** | 0.26h | |

Without Redis HA + async orchestration + circuit breakers, **99.9% is not achievable** at 5k workspaces.
