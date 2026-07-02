# Feature 004 — AI Ops Playbook

**Audience:** AI Ops / SRE engineers operating the autonomous agent mesh in production.  
**Scope:** Loop health, runaway protection, circuit breakers, SLO monitoring.

All thresholds reference `docs/004-PRODUCTION-READINESS.md` §10 unless noted.

---

## Architecture — Autonomous Loop

```
003 analytics (syncAnalytics worker)
  → marketing.campaign.underperforming on Redis stream (MARKETING_EVENTS_STREAM_KEY)
  → marketing:inngest-bridge consumer (startRedisToInngestBridge)
  → ai-cmo/campaign.underperforming (Inngest)
  → trigger-replan function
  → OptimizerAgent (ProviderRouter + traceAgentCall)
  → persistOptimizerLearnings → ai_cmo_learnings
  → future campaigns: retrieve-memory step reads learnings
```

**Kill switch:** `AI_CMO_REDIS_INNGEST_BRIDGE_ENABLED=false` on worker process (default: enabled).

---

## Loop Health Monitoring

### Redis consumer group lag

The bridge uses a **dedicated consumer group** — it does not compete with 003 `marketing:workers`.

| Env var | Default |
|---------|---------|
| `MARKETING_EVENTS_STREAM_KEY` | `marketing:events` |
| `MARKETING_INNGEST_BRIDGE_GROUP` | `marketing:inngest-bridge` |
| `MARKETING_EVENTS_CONSUMER_GROUP` | `marketing:workers` (003 only) |

**Check group health:**

```bash
redis-cli XINFO GROUPS marketing:events
```

Look for group `marketing:inngest-bridge`:

| Field | Healthy | Action if unhealthy |
|-------|---------|---------------------|
| `pending` | 0–10 | >100 → bridge stuck; check worker logs |
| `lag` | Low / 0 | Growing → Inngest stub mode or forward failures |
| `consumers` | ≥1 when worker running | 0 → restart worker (`npm run worker`) |

**Inspect pending messages:**

```bash
redis-cli XPENDING marketing:events marketing:inngest-bridge
redis-cli XREADGROUP GROUP marketing:inngest-bridge debug-consumer COUNT 5 STREAMS marketing:events 0
```

**Worker log signatures (healthy):**

```
[Worker] Starting Redis→Inngest bridge (004 autonomous loop)...
[redis-inngest-bridge] started { stream: 'marketing:events', bridgeConsumerGroup: 'marketing:inngest-bridge', ... }
[redis-inngest-bridge] event_forwarded { sourceType: 'marketing.campaign.underperforming', ... }
```

**Stub mode (unhealthy — events not reaching Inngest):**

```
[redis-inngest-bridge] inngest_stub_mode { hint: 'Install inngest + set INNGEST_EVENT_KEY ...' }
```

Fix: Install `inngest`, set `INNGEST_EVENT_KEY`, sync `/api/inngest`.

### Inngest function health

| Function ID | Expected cadence | Alert if |
|-------------|------------------|----------|
| `trigger-replan` | On underperforming events | >20 runs/hour same workspace |
| `outcome-ingestion` | Daily 02:00 UTC | 2 consecutive failures |
| `mv-refresh` | Hourly | 2 consecutive failures |
| `campaign-workflow` | On API request | >5 failures/hour |

Inngest dashboard → App **`nexus-ai-cmo`** → filter by function ID.

### Langfuse agent health

Filter traces: `tags: agent-call`, `metadata.feature: 004-ai-cmo`.

| Trace pattern | Agent |
|---------------|-------|
| `ai-cmo/agent.optimizer` | Optimizer (autonomous loop) |
| `ai-cmo/agent.strategic_brain` | Plan step |
| `ai-cmo/ai_cmo.event_replan` | Full replan workflow span |

Check `agent.completed` events for `latencyMs` and `tokenUsage`.

---

## Optimizer Runaway Protection

### Symptoms of poisoned learnings

- Brain retrieves low-confidence learnings in `retrieve-memory` step
- Campaign tone/channel recommendations drift
- `trigger-replan` runs spike (>10/hour per workspace)
- `ai_cmo_learnings` rows with `confidence < 0.5` and `validated_by_human = false` accumulate

### Step 1 — Pause the autonomous loop

On the **worker host** (not Vercel — bridge runs in `src/bin/worker.ts`):

```bash
# Set env and restart worker
AI_CMO_REDIS_INNGEST_BRIDGE_ENABLED=false npm run worker
```

Or in Docker/k8s: update env, restart worker pod. **003 publish/analytics loops continue unaffected.**

Optionally pause Inngest function `trigger-replan` in Inngest dashboard.

### Step 2 — Identify bad learnings

```sql
SELECT id, learning_type, confidence, roi_impact, context, action, created_at
FROM ai_cmo_learnings
WHERE workspace_id = '<workspaceId>'
  AND validated_by_human = false
  AND confidence < 0.5
  AND created_at > now() - interval '7 days'
ORDER BY created_at DESC;
```

Check Optimizer output in Inngest run output: `optimizerOutput.llmStubbed = true` means fallback rule-based learnings (lower quality).

### Step 3 — Purge or quarantine

**Soft quarantine (preferred):**

```sql
UPDATE ai_cmo_learnings
SET validated_by_human = false,
    context = context || '{"quarantined": true, "reason": "ai-ops-runaway-YYYY-MM-DD"}'::jsonb
WHERE workspace_id = '<workspaceId>'
  AND id IN ('<id1>', '<id2>');
-- Then DELETE only after human review
```

**Hard purge (emergency):**

```sql
DELETE FROM ai_cmo_learnings
WHERE workspace_id = '<workspaceId>'
  AND validated_by_human = false
  AND confidence < 0.5
  AND created_at > now() - interval '24 hours';
```

### Step 4 — Resume

1. Verify root cause (bad outcome data, LLM parse failures, analytics false positives).
2. Re-enable bridge: `AI_CMO_REDIS_INNGEST_BRIDGE_ENABLED=true`.
3. Restart worker; confirm `event_forwarded` logs.
4. Monitor `trigger-replan` for 1 hour.

---

## Circuit Breaker Recovery

**Implementation:** `src/lib/resilience/circuit-breaker.ts`

| State | Behavior |
|-------|----------|
| CLOSED | Normal operation |
| OPEN | 3 consecutive failures; fail-fast for 60s |
| HALF_OPEN | After cooldown; next success → CLOSED |

**Redis key format:** `circuit:{provider}:{model}` (TTL 300s on record)

### Inspect all circuits

```bash
redis-cli KEYS "circuit:*"
redis-cli GET "circuit:dify:https://api.dify.ai"
redis-cli GET "circuit:openrouter:openai/gpt-4o-mini"
```

Record JSON shape: `{"state":"OPEN","consecutiveFailures":3,"openedAt":1710000000000}`

### Manual reset (provider recovered but circuit stuck)

```bash
# Reset to CLOSED
redis-cli SET "circuit:dify:https://api.dify.ai" '{"state":"CLOSED","consecutiveFailures":0}' EX 300
redis-cli SET "circuit:openrouter:openai/gpt-4o-mini" '{"state":"CLOSED","consecutiveFailures":0}' EX 300
```

Replace Dify URL with your `DIFY_BASE_URL` env value — circuit key uses base URL as model identifier (`src/lib/dify/client.ts`).

### Verify recovery

1. Submit test campaign or replay failed Inngest step.
2. Langfuse: confirm `llmStubbed: false` on agent traces.
3. Logs: absence of `[ProviderRouter] dify circuit open — falling back`.

**Alert threshold (Production Readiness §10):** Any OPEN state >5 minutes.

---

## SLO Dashboard Reference

Target SLOs from Production Readiness §10 and enterprise spec. The codebase exports OTel spans (`nexus-ai-cmo`, `nexus-ai-cmo-agents`) and Langfuse traces — no Prometheus scrape config ships in-repo. Use the queries below in your observability stack.

### SLO 1 — Campaign API availability (target: 99.9%)

**Signal:** HTTP 5xx on campaign endpoints.

**Vercel / log drain query:**

```
path:/api/v1/ai-cmo/campaigns status:500 OR status:502 OR status:503
```

**Error budget (monthly):** 99.9% ≈ 43 minutes downtime/month.

**Burn alert:** >10 × 5xx in 5 minutes → page on-call.

---

### SLO 2 — Agent latency p95 (target: <30s per agent call)

**Signal:** `agent.latency_ms` on OTel spans; Langfuse `agent.completed` event metadata.

**Langfuse:**

- Filter: trace name starts with `ai-cmo/agent.`
- Metric: Latency p95 over 1h rolling window
- Alert: p95 > 30,000 ms for any agent name

**OTel (if exported to Grafana Tempo / Honeycomb):**

```
span.name =~ "agent.*"
| p95(duration) by span.name
```

**Remediation:** Check circuit breakers, Dify latency, OpenRouter fallback rate.

---

### SLO 3 — Campaign workflow success rate

**Signal:** Inngest function `campaign-workflow` completion vs failure.

**Inngest dashboard:** Failure rate over 1h.

**Alert threshold:** >5 failures/hour (Production Readiness §10).

**SQL corroboration:**

```sql
SELECT status, COUNT(*)
FROM ai_cmo_campaigns
WHERE created_at > now() - interval '1 hour'
GROUP BY status;
```

---

### SLO 4 — Autonomous loop freshness

**Signal:** Time from underperforming event to learning persisted.

**Check:**

```sql
SELECT l.created_at, l.learning_type, l.confidence
FROM ai_cmo_learnings l
WHERE l.workspace_id = '<workspaceId>'
ORDER BY l.created_at DESC
LIMIT 5;
```

Compare against Redis stream last ID:

```bash
redis-cli XREVRANGE marketing:events + - COUNT 1
```

**Alert:** No learnings in 7 days while underperforming campaigns exist and bridge is enabled.

---

### SLO 5 — FinOps MV freshness

**Signal:** `mv-refresh` cron success.

**SQL:**

```sql
-- Manual refresh if stale
SELECT refresh_ai_cmo_materialized_views();

SELECT * FROM ai_cmo_cost_summary WHERE workspace_id = '<workspaceId>' LIMIT 1;
```

**Alert:** 2 consecutive `mv-refresh` failures.

---

### SLO 6 — Budget governance

**Signal:** `BudgetExceededError` rate + spend proximity to cap.

```sql
SELECT
  bp.cap_usd,
  SUM(cl.amount_usd) AS spend_mtd,
  SUM(cl.amount_usd) / NULLIF(bp.cap_usd, 0) AS pct_of_cap
FROM ai_cmo_budget_policies bp
LEFT JOIN ai_cmo_cost_ledger cl
  ON cl.workspace_id = bp.workspace_id
  AND cl.recorded_at >= date_trunc('month', now())
WHERE bp.workspace_id = '<workspaceId>'
GROUP BY bp.cap_usd;
```

**Alert:** spend >80% of cap (warn); finops-preflight blocks at 100%.

---

### SLO 7 — Approval queue SLA

```sql
SELECT severity, COUNT(*)
FROM ai_cmo_approval_requests
WHERE status = 'pending'
GROUP BY severity;
```

**Alert:** >10 pending `CRITICAL` (Production Readiness §10).

---

## Metrics → Thresholds → Actions (Summary)

| Metric | Source | Threshold | Action |
|--------|--------|-----------|--------|
| Bridge pending count | `XINFO GROUPS` | >100 | Restart worker; check Inngest keys |
| `trigger-replan` runs/hr | Inngest | >20/workspace | Pause bridge; purge learnings |
| Circuit state OPEN | Redis `circuit:*` | >5 min | Manual reset; verify provider |
| Campaign workflow failures | Inngest | >5/hr | SRE runbook; check LLM + reconciler |
| Agent p95 latency | Langfuse / OTel | >30s | Circuit + provider triage |
| MV refresh failures | Inngest cron | 2 consecutive | Run RPC manually; check Supabase |
| Budget spend / cap | SQL | >80% | Notify tenant; raise cap if approved |
| CRITICAL approvals | SQL | >10 pending | Escalate compliance |
| Rate limit hits | Logs / Redis | Sustained | Investigate loop; DEL rate key |

---

## ProviderRouter Fallback Chain

Order: **dify → openrouter** (`src/lib/ai/providers/provider-router.ts`)

When all providers fail, agents return `stubbed: true` / `llmStubbed: true`. This is **not** a crash — but downstream quality gates may reject content.

**Monitor:** Langfuse metadata `attemptedProviders` array on traces.

---

## Environment Quick Reference

| Variable | Purpose |
|----------|---------|
| `AI_CMO_REDIS_INNGEST_BRIDGE_ENABLED` | Autonomous loop kill switch |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Workflow execution |
| `DIFY_BASE_URL` / `DIFY_API_KEY` | Primary LLM |
| `OPENROUTER_API_KEY` | Fallback LLM |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | AI ops traces |
| `AI_CMO_DEFAULT_BUDGET_CAP_USD` | Default cap when no policy row (default `100`) |

---

## Related Documents

- Incident triage: `docs/004-SRE-RUNBOOK.md`
- Deploy checklist: `docs/004-PRODUCTION-READINESS.md`
- UAT: `docs/UAT-004-POSTMAN-COLLECTION.md`
