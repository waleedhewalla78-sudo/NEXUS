# Phase 4 — Memory & Learning Layer

**Date:** 2026-06-23 · **Migration ref:** `20260624_000012_ai_cmo_foundation.sql`

---

## Purpose

Close the loop: **Decision → Execution → Outcome → Lesson → Next Decision**. Memory is System of Intelligence (SoI); all durable writes go through reconciler (L7).

---

## Table Inventory: Exists vs New

### Exists in 000012 (Live — `schema:verify:004` 11/11)

| Table | Purpose | RLS | Runtime code |
|-------|---------|-----|--------------|
| `ai_cmo_learnings` | Validated patterns (content, timing, audience, channel, tone) | ✓ workspace_members | **None** — reconciler schema ready |
| `ai_cmo_campaign_outcomes` | KPI snapshots per campaign | ✓ | **None** |
| `ai_cmo_strategy_history` | Audit trail of strategy changes | ✓ | **None** |
| `ai_cmo_strategies` | Strategy definitions (config JSONB) | ✓ | **None** |
| `ai_cmo_content_pieces` | Pre-publish content drafts | ✓ | ✓ via `campaign-service.ts` |

**000012 columns of note:**

- `ai_cmo_learnings`: `learning_type`, `context`, `action`, `outcome`, `roi_impact`, `confidence`, `validated_by_human`
- `ai_cmo_campaign_outcomes`: `impressions`, `clicks`, `conversions`, `leads_generated`, `revenue_attributed`, `cost`, `roi_ratio`, `lessons_learned`, `human_review`
- `ai_cmo_strategy_history`: `strategy_id`, `change_type`, `previous_state`, `new_state`, `reason`, `triggered_by`

### Documented in data-model but NOT in 000012

| Table | Purpose | Action |
|-------|---------|--------|
| `ai_cmo_decision_ledger` | Module W — decision → KPI variance → lesson | **Migration 000013** |

### Proposed new tables (Phase C)

| Table | Purpose |
|-------|---------|
| `ai_cmo_experiments` | A/B variant tracking (agent, prompt, channel) |
| `ai_cmo_agent_decisions` | Immutable log of agent outputs pre-reconciler |
| `ai_cmo_memory_summaries` | Compacted rolling summaries per workspace/brand |

---

## Proposed: `ai_cmo_experiments`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| workspace_id | UUID | FK workspaces |
| campaign_id | UUID | FK ai_cmo_campaigns |
| experiment_key | TEXT | e.g. caption_variant_a |
| variant | TEXT | A/B/C |
| hypothesis | TEXT | |
| metrics | JSONB | Primary KPI targets |
| status | TEXT | draft, running, concluded |
| winner_variant | TEXT | nullable |
| started_at | TIMESTAMPTZ | |
| concluded_at | TIMESTAMPTZ | |

---

## Proposed: `ai_cmo_agent_decisions`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| workspace_id | UUID | FK |
| campaign_id | UUID | FK nullable |
| agent_name | TEXT | brain, creator, optimizer, … |
| input_hash | TEXT | Idempotency |
| input_summary | JSONB | Redacted input |
| output | JSONB | Full agent output |
| model_used | TEXT | |
| token_count | INT | |
| latency_ms | INT | |
| created_at | TIMESTAMPTZ | |

Retention: 90 days hot Postgres → archive S3. PII scrubbed at write.

---

## Retrieval Architecture

```text
Brain.retrieveMemory(objective)
        │
        ├──► Postgres: ai_cmo_learnings (validated_by_human=true OR confidence>0.8)
        │         ORDER BY roi_impact DESC LIMIT 10
        │
        ├──► Qdrant: hybrid search on objective + brand embedding
        │         Collection: workspace_{workspaceId}_learnings
        │
        └──► Merge + dedupe → ranked context bundle
```

**Current code gap:** `campaign-workflow-deps.ts` line 63: `retrieveMemory: async () => []`

---

## Retention Policy

| Data class | Hot retention | Archive | Deletion |
|------------|---------------|---------|----------|
| Learnings (validated) | Indefinite | — | On workspace delete (CASCADE) |
| Learnings (unvalidated) | 180 days | S3 | Auto-purge job |
| Agent decisions | 90 days | 7 years (enterprise) | PDPL erasure on request |
| Campaign outcomes | Indefinite | — | Anonymize visitor refs after 24mo |
| Strategy history | Indefinite | — | — |
| Experiments concluded | 365 days | Aggregate to learnings | Purge raw |

**Compliance:** UAE PDPL / Egypt DPL — implement `scrubPii()` before JSONB persist on `context`, `outcome`, `human_review`.

---

## Summarization Pipeline

| Trigger | Input | Output |
|---------|-------|--------|
| Weekly cron | Last 30d learnings per brand | `ai_cmo_memory_summaries` row |
| Optimizer conclude | Campaign outcomes + decisions | New `ai_cmo_learnings` row |
| Human validation | Flagged learning | `validated_by_human=true` |

Summarization model: lightweight OpenRouter call (not Dify) to reduce cost.

---

## Feedback Loops

### Loop 1 — Campaign performance

```text
post_analytics (003) → outcome job → ai_cmo_campaign_outcomes
        → Optimizer agent → ai_cmo_learnings → Brain retrieval
```

### Loop 2 — Quality regression

```text
ai_cmo_evaluations (low score) → block similar patterns → policy rule proposal
```

### Loop 3 — Human override

```text
ai_cmo_approval_requests (rejected) → negative learning → Creator prompt adjustment
```

### Loop 4 — Experiment conclusion

```text
ai_cmo_experiments (winner) → promote to learning → strategy_history entry
```

---

## Qdrant Integration (Existing)

| Asset | Current | Target |
|-------|---------|--------|
| Post analytics RAG | `ingest-post-analytics-rag.ts` (6h cron) | Event-driven on sync |
| Learnings index | **Missing** | Index on learning create |
| Collection naming | Per workspace pattern from 003 | `ws_{id}_learnings` |

---

## MemoryRepository Interface (Spec)

| Method | Description |
|--------|-------------|
| `retrieve({ workspaceId, brandId?, objective, k })` | Hybrid PG + Qdrant |
| `storeLearning(input)` | Via reconciler → `ai_cmo_learnings` |
| `recordOutcome(input)` | Via reconciler → `ai_cmo_campaign_outcomes` |
| `appendStrategyHistory(input)` | Via reconciler → `ai_cmo_strategy_history` |

**Sprint 14 deliverable:** `src/lib/ai-cmo/memory-repository.ts`

---

## Exists vs New Summary

| Artifact | 000012 | New migration | Code |
|----------|--------|---------------|------|
| ai_cmo_learnings | ✓ | — | Missing |
| ai_cmo_campaign_outcomes | ✓ | — | Missing |
| ai_cmo_strategy_history | ✓ | — | Missing |
| ai_cmo_strategies | ✓ | — | Missing |
| ai_cmo_decision_ledger | ✗ | 000013 | Missing |
| ai_cmo_experiments | ✗ | 000013 | Missing |
| ai_cmo_agent_decisions | ✗ | 000013 | Missing |
| ai_cmo_memory_summaries | ✗ | 000013 | Missing |
| MemoryRepository | — | — | Missing |
| retrieveMemory wired | — | — | **Stub []** |
