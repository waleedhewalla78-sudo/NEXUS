# Phase 5 — Policy & Governance

**Date:** 2026-06-23 · **Constitution ref:** Principle VI — Risk-based governance, never confidence-only  
**Current implementation:** `src/lib/governance/policy-engine.ts`

---

## Core Rule

**Approval routing is determined by risk tier and policy violations — never by LLM confidence alone.**

Calibrated confidence (`calibrated-confidence.ts`) informs explainability and quality bands; it **must not** override a CRITICAL or HIGH policy block.

---

## Risk Tier Model

| Tier | Code | Auto-publish | Human approval | Example triggers |
|------|------|--------------|----------------|------------------|
| **LOW** | L | ✓ Allowed if quality ≥ threshold | Optional spot-check | Generic brand awareness post, no regulated terms |
| **MED** | M | ✗ | Single operator approval | Competitor mention without pricing, new channel |
| **HIGH** | H | ✗ | Compliance reviewer + operator | Government segment, healthcare/financial, Arabic dialect low confidence |
| **CRITICAL** | C | ✗ **Never** | Legal counsel required | Pricing claims vs competitor, legal/regulatory claims, religious/political (block) |

### Tier assignment logic

```text
1. Run POLICY_RULES → collect violations
2. If any violation action=block → CRITICAL (stop)
3. Max(severity) across violations → tier mapping:
     critical + require_approval → CRITICAL
     high + require_approval → HIGH
     medium → MED
     none → LOW
4. Quality score MAY downgrade auto-publish within LOW only (not upgrade tier)
```

---

## Policy Catalog (Current + Proposed)

### Implemented in `POLICY_RULES` (6 rules)

| ID | Name | Severity | Action | Condition summary |
|----|------|----------|--------|-------------------|
| competitor-pricing | Competitor Pricing Claims | critical | require_approval | Competitor + pricing data |
| legal-claims | Legal/Regulatory Claims | critical | require_approval | Legal/compliance language |
| government-sector | Government Sector Content | high | require_approval | Government/public sector targeting |
| religious-political | Religious/Political Topics | critical | **block** | Religious/political content |
| arabic-dialect-accuracy | Arabic Dialect Accuracy | high | require_approval | ar-* locale + confidence < 0.9 |
| healthcare-financial | Healthcare/Financial Services | high | require_approval | Regulated industry |

### Proposed additions (Sprint 15–16)

| ID | Name | Tier | Action | Rationale |
|----|------|------|--------|-----------|
| pdpl-data-claim | Personal data processing claims | CRITICAL | require_approval | UAE PDPL / Egypt DPL |
| unverified-statistic | Unsourced statistics | HIGH | require_approval | EEAT / brand safety |
| influencer-disclosure | Sponsored content missing disclosure | HIGH | require_approval | ASA/MENA ad standards |
| geo-restricted-offer | Offer not valid in target region | HIGH | block | Multi-region agencies |
| ai-generated-disclosure | Undisclosed AI-generated content | MED | require_approval | EU AI Act alignment |
| minor-targeting | Content appealing to minors | CRITICAL | block | Platform policies |
| crypto-financial-promo | Crypto/forex promotion | CRITICAL | require_approval | Financial promotions |
| emergency-keywords | Crisis/emergency exploitation | CRITICAL | block | Brand safety |
| trademark-competitor | Competitor trademark usage | HIGH | require_approval | Legal |
| bulk-discount-claim | "% off" without terms | MED | require_approval | Consumer protection |

---

## Risk-Based Approval Workflow

```text
Creator output
     │
     ▼
PolicyEngine.evaluate(ContentPiece)  ← structured fields, NOT regex on JSON
     │
     ├── CRITICAL block ──► status: policy_blocked (no publish path)
     │
     ├── CRITICAL/HIGH/MED approval ──► ai_cmo_approval_requests
     │                                      │
     │                                      ▼
     │                               L1 Approval Inbox
     │                                      │
     │                              approved │ rejected
     │                                      ▼
     └── LOW + quality OK ──────────► reconciler → publish path
```

### Approval request schema (proposed)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| workspace_id | UUID | FK |
| content_id | UUID | FK ai_cmo_content_pieces |
| risk_tier | TEXT | LOW/MED/HIGH/CRITICAL |
| violations | JSONB | PolicyViolation[] |
| status | TEXT | pending, approved, rejected, expired |
| assignee_id | UUID | nullable |
| sla_due_at | TIMESTAMPTZ | Tier-based: C=4h, H=24h, M=72h |
| resolved_by | UUID | |
| resolved_at | TIMESTAMPTZ | |

---

## ContentPiece Contract (Target)

Replace regex heuristics in `campaign-workflow-deps.ts` with structured extraction:

| Field | Source |
|-------|--------|
| text | Creator caption + CTA |
| locale | Campaign/brand config |
| industry | Brand or workspace settings |
| mentionsCompetitor | NER or explicit flag from Brain plan |
| containsPricingData | NER ($, %, pricing keywords) |
| containsLegalLanguage | Classifier |
| containsComplianceTerms | PDPL keyword list |
| targetsGovernmentSegment | Plan metadata |
| containsReligiousOrPoliticalContent | Classifier (high recall) |
| confidence | Quality engine score (auxiliary only) |

---

## MENA Compliance Extensions

| Regulation | Requirement | Policy mapping |
|------------|-------------|----------------|
| UAE PDPL | Lawful basis for data use in copy | pdpl-data-claim |
| Egypt Law 151/2020 | Cross-border data mention controls | geo-restricted-offer |
| GDPR (EU clients) | AI disclosure, DPIA for profiling | ai-generated-disclosure |
| Platform TOS | Meta/LinkedIn ad policies | Channel Risk agent (Phase G) |

**Compliance Agent (Sprint 16):** Runs after PolicyEngine for MED+ tiers; adds jurisdiction-specific rules from `tenants.data_region`.

---

## Audit Trail

| Event | Storage |
|-------|---------|
| Policy evaluation | `audit_logs` via reconciler + `evaluation_details` JSONB |
| Approval decision | `ai_cmo_approval_requests` |
| Human override | `human_override=true` on decision ledger |
| Block reason | Returned to client + Langfuse trace |

---

## Anti-Patterns (Current Code)

| Anti-pattern | Location | Fix |
|--------------|----------|-----|
| Regex on `JSON.stringify(plan)` for policy | `campaign-workflow-deps.ts` policyReview | Structured ContentPiece from plan |
| Quality score triggers approval independent of tier | `campaign-workflow.ts` score < 0.85 | Apply only when tier=LOW |
| Hardcoded confidence 0.85 in policyReview | deps line 58 | Use quality engine output |
| No approval persistence | routeToApproval callback | approval_requests table |

---

## Governance Metrics (AI Ops)

| Metric | Target |
|--------|--------|
| Policy violation rate | 0% auto-publish on CRITICAL |
| Approval SLA compliance | >95% within tier SLA |
| False positive rate (human overturn) | <10% quarterly |
| Blocked content appeals | Track + tune rules |

See [07-quality-evaluation.md](./07-quality-evaluation.md) for quality vs policy separation.
