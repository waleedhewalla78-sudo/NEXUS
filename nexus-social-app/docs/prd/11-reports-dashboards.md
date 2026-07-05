# 11. Reports & Dashboards

← [PRD Index](./README.md)

---

## 11.1 Dashboard inventory

| Screen | Audience | Key metrics | Source | Filters | Refresh |
|--------|----------|-------------|--------|---------|---------|
| `/` | Operator | Workspace summary | SoR | Workspace | On load |
| `/analytics` | Operator | Engagement, reach | Analytics sync | Date | Worker |
| `/analytics/ai-performance` | Operator | Agent performance | `ai_cmo_*` | Workspace | On load |
| `/analytics/sentiment` | Operator | Sentiment | Listening | Date | Periodic |
| `/ai-cmo/abm` | CMO | Intent scores | `account_intent_scores` | Workspace | On load |
| `/ai-cmo/attribution` | CMO, Founder | Revenue, touches | `attribution_reports` | Month, channel | On load |
| `/ai-cmo/control-plane` | Operator | Agent health | Control plane API | Workspace | Poll |
| `/ai-cmo/approvals` | Compliance | Pending queue | Approvals API | Status | On load |
| `/ai-cmo/intelligence` | Operator | Paid media charts | Import API | Campaign | On upload |
| `/intelligence` | CMO | Briefs, anomalies | `intelligence_*` | Date range | On load |
| `/enterprise/leads` | AE, Founder | Lead pipeline | `enterprise_leads` | Workspace | On load |
| `/admin/margins` | Founder | Gross margin % | **Planned** roster | Month | **Sprint 6** |

---

## 11.2 Exported reports

| Report | Format | Trigger | Audience |
|--------|--------|---------|----------|
| Attribution export | API/CSV | Attribution API | CMO |
| Audit PDF | PDF | `/api/reports/audit-pdf` | Compliance |
| Calendar HTML | HTML download | Intelligence page | Operator |
| Pilot summary | Console text | `generate:pilot-report` | Founder → client |
| Intelligence brief | Clipboard | `/intelligence` | CMO |

---

## 11.3 FinOps metrics

| Metric | Source | Threshold |
|--------|--------|-----------|
| Token spend/campaign | `ai_cmo_cost_ledger` | Budget caps |
| Monthly LLM/workspace | Cost summary | &lt;55% margin alert (S6) |
| ROAS | Finance agent | Dashboard |
