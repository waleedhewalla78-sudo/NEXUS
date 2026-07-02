# Phase 7 — Optimizer Agent Specification

**Date:** 2026-06-23 · **PRD Module:** G · **Planned path:** `src/jobs/ai-cmo/optimizer-agent.ts` (Sprint 14)

---

## Role in Agent Mesh

The **Optimizer** closes the marketing loop. It consumes measured outcomes and produces actionable learnings and strategy adjustments — it does **not** write SoR directly.

| Agent | Phase | Input | Output |
|-------|-------|-------|--------|
| Strategic Brain | Plan | Objective + memory | Strategic plan |
| Creator | Create | Plan | Content draft |
| **Optimizer** | **Learn** | **Outcomes + decisions + analytics** | **Learnings + strategy deltas** |
| Radar | Sense | External signals | Events to bus |
| Quant | Analyze | Metrics | Insights to Brain |
| Sentinel | Guard | Anomaly signals | Alerts |

---

## Responsibilities

1. **Performance diagnosis** — Compare `expected_kpis` (from Brain plan) vs `ai_cmo_campaign_outcomes` actuals
2. **Variance attribution** — Channel, content type, timing, audience segment decomposition
3. **Learning extraction** — Generate structured rows for `ai_cmo_learnings` (type: content_pattern | timing | audience | channel | tone)
4. **Strategy revision proposals** — Diff for `ai_cmo_strategy_history` + updated `ai_cmo_strategies.config`
5. **Replan recommendations** — Emit `marketing.campaign.underperforming` or Inngest `event-replan` when thresholds breached
6. **Experiment conclusion** — Finalize `ai_cmo_experiments` with winner variant
7. **Budget reallocation hints** — Feed Portfolio S&OP (Phase G) with ROI-by-channel summary

---

## Triggers

| Trigger | Source | Frequency |
|---------|--------|-----------|
| Outcome ingestion complete | Inngest `outcome-ingestion` | Every 6h |
| Underperforming event | Event bus | Real-time |
| Campaign completed + 48h cooldown | Inngest schedule | Per campaign |
| Manual "Analyze campaign" | L1 Dashboard | On demand |
| Daily batch | Inngest cron 02:00 UTC | Active campaigns |

---

## Inputs

| Source | Table / API | Fields used |
|--------|-------------|-------------|
| Campaign metadata | `ai_cmo_campaigns` | objective, status, brand_id |
| Content history | `ai_cmo_content_pieces` | content JSONB, locale |
| Outcomes | `ai_cmo_campaign_outcomes` | impressions, clicks, conversions, ROI |
| Analytics (003) | `post_analytics` | Platform-native metrics |
| Prior decisions | `ai_cmo_agent_decisions` | Brain/Creator outputs |
| Existing learnings | `ai_cmo_learnings` | Avoid duplicate lessons |
| Cost | `ai_cmo_cost_ledger` | Cost per lead calculations |
| Evaluations | `ai_cmo_evaluations` | Quality vs performance correlation |

---

## Outputs

| Output | Destination | Via |
|--------|-------------|-----|
| Learning rows | `ai_cmo_learnings` | reconciler |
| Strategy history | `ai_cmo_strategy_history` | reconciler |
| Strategy config update | `ai_cmo_strategies` | reconciler updateSoR |
| Decision record | `ai_cmo_decision_ledger` | reconciler (000013) |
| Replan event | MarketingEventBus / Inngest | publish |
| Executive summary | Explainability renderer (persona=executive) | API response |
| Qdrant vectors | Learning embeddings | SoI index job |

### Optimizer output schema (agent JSON)

| Field | Type | Description |
|-------|------|-------------|
| diagnosis | string | Plain-language summary |
| variance | object | KPI expected vs actual |
| learnings | array | { type, context, action, outcome, roi_impact, confidence } |
| strategy_delta | object | Partial config patch |
| recommended_actions | array | pause, scale, replan, new_experiment |
| risk_assessment | string | LOW/MED/HIGH for automated actions |

---

## Memory Integration

```text
Optimizer.run(campaignId)
        │
        READ ◄── MemoryRepository.retrieve (similar past campaigns)
        │
        ANALYZE ◄── outcomes + analytics + costs
        │
        WRITE ──► reconciler.storeLearning (1..N rows)
        │
        INDEX ──► Qdrant upsert (async job)
        │
        NOTIFY ──► Brain (next plan retrieves new learnings)
```

**Validation gate:** Learnings with `confidence < 0.6` OR `risk_assessment >= HIGH` require `validated_by_human=false` until approved in L1.

---

## Runtime Design

| Concern | Choice |
|---------|--------|
| LLM runtime | Dify Optimizer app → OpenRouter fallback |
| Execution | Inngest function `optimizer-loop` (not sync API) |
| Idempotency | `{workspaceId}:{campaignId}:{outcomeMeasuredAt}` |
| Cost cap | FinOps pre-check; max 8k tokens per run |
| Failure | Retry 2× → DLQ; partial learnings rolled back |

---

## Integration with Event Consumers

Current stub in `marketing-event-consumers.ts`:

- `createUnderperformingCampaignHandler` logs + optional `triggerReplan`
- **Target:** `triggerReplan` → Inngest.send('optimizer/replan', { campaignId, reason })

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Learning precision (human validated) | >70% accepted |
| Replan ROI improvement | +10% vs no-op control |
| Optimizer latency p95 | <45s |
| False replan rate | <5% |

---

## Dependencies

| Dependency | Status | Phase |
|------------|--------|-------|
| `ai_cmo_campaign_outcomes` populated | Missing | C |
| MemoryRepository | Missing | C |
| Inngest | Not installed | B |
| `ai_cmo_decision_ledger` | Missing | C |
| Dify Optimizer app | Not published | Operator |

**Optimizer must not ship before outcome ingestion (Sprint 14 S14-T008).**
