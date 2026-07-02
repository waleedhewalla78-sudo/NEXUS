# Phase 10 — SEO & Content Hardening

**Date:** 2026-06-23 · **PRD Module:** D · **Current:** `src/lib/quality/content-quality-engine.ts`

---

## Scope

AI CMO generates social content; SEO hardening covers:

1. **Content Quality Gate** — pre-publish composite checks  
2. **EEAT** — Experience, Expertise, Authoritativeness, Trustworthiness signals in copy  
3. **Cannibalization prevention** — internal duplicate topic/keyword collision  

Social posts affect SEO indirectly (brand SERP, linked articles). For workspaces with **blog/landing integrations** (future Activepieces flows), gates extend to long-form.

---

## Content Quality Gate (Enhanced)

Integrates with [07-quality-evaluation.md](./07-quality-evaluation.md) eight dimensions.

### Gate stages

| Stage | Check | Block? |
|-------|-------|--------|
| G1 — Structural | Platform char limits, hashtag count, link count | Hard block |
| G2 — Uniqueness | Embedding similarity vs 90-day content | Hard block if >0.92 |
| G3 — EEAT heuristics | Author attribution, date freshness, source citation | Soft → Judge |
| G4 — Keyword collision | Same primary keyword + locale in active campaigns | Warn / block |
| G5 — LLM-as-Judge | Full 8-dimension eval | Auto-reject thresholds |

**Current `ContentQualityEngine`:** Local text checks only — extend G1–G2 in Sprint 14.

---

## EEAT Framework for AI-Generated Marketing

| EEAT pillar | Automated check | Creator prompt injection |
|-------------|-----------------|--------------------------|
| **Experience** | First-person brand stories present | "Use concrete customer outcome from RAG" |
| **Expertise** | Technical terms used correctly | Industry glossary from Knowledge Hub |
| **Authoritativeness** | Brand credentials, awards cited | `brand_voice_config.credentials` |
| **Trustworthiness** | Disclosure, contact, no overclaims | Policy engine legal rules |

### EEAT score computation

| Signal | Weight |
|--------|--------|
| Named source/citation | 25% |
| Brand credential mention | 25% |
| Specific vs vague claims | 25% |
| Appropriate hedging (no absolute guarantees) | 25% |

Store in `evaluation_details.eeat_breakdown`.

---

## Cannibalization Prevention

### Problem

At 100k assets/month, workspaces will regenerate similar captions — harming engagement and SEO for linked content.

### Detection algorithm

```text
1. Embed new content (caption + primary keyword)
2. Query:
     - ai_cmo_content_pieces (90 days, same workspace+brand)
     - posts (published, same platforms)
     - Qdrant ws_{id}_content collection
3. If cosine_similarity > 0.92 → BLOCK (auto-reject)
4. If 0.85–0.92 → REQUIRE revision (Creator retry with "differentiate" instruction)
5. If same primary_keyword + locale + platform in active campaign → WARN
```

### Primary keyword extraction

- From Brain plan `keyMessages` + hashtag analysis  
- Store `content.primary_keyword` in JSONB for indexing  

### Proposed index

| Index | Table | Columns |
|-------|-------|---------|
| idx_content_keyword | ai_cmo_content_pieces | (workspace_id, (content->>'primary_keyword')) |

---

## SEO-Specific Rules (Social + Web)

| Rule | Action |
|------|--------|
| Duplicate meta description (if web snippet) | Block |
| Keyword stuffing (>3% density) | Revise |
| Missing UTM on campaign links | Warn |
| Broken link in CTA | Block (HTTP HEAD check) |
| hreflang mismatch for MENA locales | Require approval |

---

## Integration with Workflow

```text
Creator → ContentQualityEngine (G1-G2)
       → Cannibalization check (G2)
       → PolicyEngine (risk tier)
       → LLM-as-Judge (G3-G5)
       → if pass → reconciler
```

**Current gap:** No embedding similarity; no keyword registry.

---

## Knowledge Hub tie-in (Module J)

| Source type | EEAT benefit |
|-------------|--------------|
| Case studies | Experience |
| Whitepapers | Expertise |
| Press releases | Authoritativeness |
| Legal disclaimers | Trustworthiness |

Index into Qdrant for Creator RAG context.

---

## Metrics

| Metric | Target |
|--------|--------|
| Cannibalization block rate | 3–8% (healthy dedup) |
| EEAT score avg | >0.75 |
| Engagement lift vs duplicate | +15% (validated by Optimizer) |
| Publish rejection (SEO gate) | <5% |

---

## Sprint Mapping

| Task | Phase |
|------|-------|
| Embedding similarity service | E (Sprint 14) |
| primary_keyword in content JSONB | E |
| EEAT in LLM-as-Judge | E |
| Qdrant content collection | C |
| Blog/long-form gates | Future (Activepieces) |
