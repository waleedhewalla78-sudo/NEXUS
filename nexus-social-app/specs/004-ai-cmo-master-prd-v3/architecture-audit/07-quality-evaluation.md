# Phase 6 — Quality Evaluation Framework

**Date:** 2026-06-23 · **Current:** `content-quality-engine.ts`, `ai_cmo_evaluations` schema (000012)

---

## Eight Evaluation Dimensions

Quality is **orthogonal to policy risk**. A LOW-risk post can fail quality; a HIGH-risk post must never auto-publish regardless of quality score.

| # | Dimension | Weight | Description | Automated? |
|---|-----------|--------|-------------|------------|
| 1 | **Accuracy / factual grounding** | 15% | Claims supported by brand knowledge or sources | LLM-as-Judge + RAG citation check |
| 2 | **Brand alignment** | 15% | Voice, tone, values per `brands.brand_voice_config` | LLM-as-Judge |
| 3 | **Localization** | 12% | Locale/dialect correctness (critical for ar-SA, ar-EG) | LLM-as-Judge + locale rules |
| 4 | **Uniqueness** | 12% | Not duplicate of recent posts (internal cannibalization) | Embedding similarity vs `posts` + content_pieces |
| 5 | **EEAT signals** | 13% | Experience, expertise, authority, trust markers | Heuristic + Judge |
| 6 | **Engagement potential** | 10% | CTA clarity, hook strength, format fit | LLM-as-Judge |
| 7 | **Platform compliance** | 13% | Character limits, hashtag norms, media requirements | Rule engine per platform |
| 8 | **Safety / hallucination** | 10% | No fabricated products, dates, offers | `hallucination_flag` + Judge |

**Composite:** Weighted sum → `overall_quality_score` (0–1)

---

## Current Schema (`ai_cmo_evaluations` — 000012)

| Column | Exists | Maps to dimension |
|--------|--------|-------------------|
| accuracy_score | ✓ | 1 Accuracy |
| localization_score | ✓ | 3 Localization |
| brand_alignment_score | ✓ | 2 Brand alignment |
| hallucination_flag | ✓ | 8 Safety |
| overall_quality_score | ✓ | Composite |
| evaluation_details | JSONB ✓ | All dimension breakdowns |
| evaluator_type | ✓ | llm_as_judge, human, automated |

**Gap:** No columns for uniqueness, EEAT, engagement, platform compliance — store in `evaluation_details` until migration extends schema.

---

## Proposed Schema Extensions (Migration 000013)

| Column | Type | Dimension |
|--------|------|-----------|
| uniqueness_score | FLOAT 0–1 | 4 |
| eeat_score | FLOAT 0–1 | 5 |
| engagement_score | FLOAT 0–1 | 6 |
| platform_compliance_score | FLOAT 0–1 | 7 |
| safety_score | FLOAT 0–1 | 8 (explicit; redundant with hallucination_flag) |
| auto_rejected | BOOLEAN | Gate outcome |
| rejection_reasons | TEXT[] | Human-readable |
| content_hash | TEXT | Dedup key |
| evaluator_model | TEXT | Audit |
| workflow_run_id | TEXT | Trace to Inngest |
| risk_tier | TEXT | Cross-ref policy tier at eval time |
| calibrated_confidence | FLOAT | Cross-ref Module S |

---

## Evaluation Pipeline

```text
Creator output
     │
     ▼
ContentQualityEngine.evaluate()  ← dimensions 4, 7 (local rules)
     │
     ▼
LLM-as-Judge (OpenRouter)  ← dimensions 1, 2, 3, 5, 6, 8
     │
     ▼
Merge scores → overall_quality_score
     │
     ├── auto_reject? ──► routeToApproval + flag
     │
     └── pass ──► reconciler → ai_cmo_evaluations INSERT
```

**Trigger:** Inngest step after `generateContent`, before `syncToSoR`.

---

## Auto-Reject Thresholds

| Condition | Action | Rationale |
|-----------|--------|-----------|
| `hallucination_flag = true` | **Auto-reject** | Zero tolerance |
| `overall_quality_score < 0.55` | **Auto-reject** | Below minimum viable |
| `uniqueness_score < 0.70` | **Auto-reject** | Cannibalization (see doc 11) |
| `localization_score < 0.75` AND locale starts with `ar-` | **Auto-reject** | MENA brand safety |
| `platform_compliance_score < 0.80` | **Auto-reject** | Prevent publish failures |
| `accuracy_score < 0.60` | **Auto-reject** | Misinformation risk |
| `0.55 ≤ overall < 0.70` | Revise loop (Creator retry 1×) | Cost-controlled |
| `0.70 ≤ overall < 0.85` AND risk_tier=LOW | Human approval | Current workflow alignment |
| `overall ≥ 0.85` AND risk_tier=LOW | Auto-publish eligible | Quality gate pass |

**Important:** CRITICAL/HIGH/MED risk tiers **always** require human approval regardless of quality ≥ 0.85.

---

## LLM-as-Judge Prompt Contract

| Input | Content |
|-------|---------|
| Brand voice | `brands.brand_voice_config` |
| Locale | Campaign locale |
| Plan context | Strategic plan key messages |
| Content | Caption, CTA, hashtags |
| RAG snippets | Top-k from Qdrant (optional) |

| Output JSON | Fields |
|-------------|--------|
| scores | 8 dimension floats |
| hallucination_flag | boolean |
| citations | string[] |
| reasoning | string (stored in evaluation_details) |

---

## Human Evaluation Loop

| Trigger | Action |
|---------|--------|
| Operator rejects in approval UI | `evaluator_type=human`, scores override |
| Quarterly sample (5%) | Human review for calibration |
| Low Judge–human correlation | Retrain prompts / adjust weights |

---

## Integration with Existing Code

| Module | Current | Target |
|--------|---------|--------|
| `ContentQualityEngine` | 3–4 local checks | Extend dimensions 4, 7 |
| `shouldPublish(quality)` | Single threshold | Use auto-reject table above |
| `ai_cmo_evaluations` | Empty table | Write on every generation |
| Calibrated confidence | Separate API | Persist on evaluation row |
| Explainability panel | Shows confidence | Add dimension breakdown |

---

## Metrics

| Metric | Target |
|--------|--------|
| Auto-reject rate | 5–15% (tune) |
| Judge–human agreement | >85% |
| Publish failure rate (platform) | <2% |
| Revision loop success | >60% pass on retry |

See [11-seo-hardening.md](./11-seo-hardening.md) for EEAT and cannibalization detail.
