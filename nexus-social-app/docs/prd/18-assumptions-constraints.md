# 18. Assumptions & Constraints

← [PRD Index](./README.md) · [01 Vision & Scope](./01-product-vision-scope.md)

---

## 18.1 Assumptions

| ID | Assumption |
|----|------------|
| A-01 | Supabase remains primary SoR |
| A-02 | Single VPS sufficient through Client #3 |
| A-03 | Pilot clients accept GitHub OAuth login |
| A-04 | MENA clients can export GA4 as CSV |
| A-05 | OpenRouter or fallback acceptable for briefs |
| A-06 | Founder operates as agency principal |
| A-07 | `nexussocial.tech` is canonical prod domain |
| A-08 | English primary UI; Arabic content generation supported |

---

## 18.2 Technical constraints

| ID | Constraint |
|----|------------|
| C-01 | 8GB RAM — no heavy background sync workers |
| C-02 | CL-030 — frozen campaign workflow / reconciler |
| C-03 | Docker standalone excludes maintenance scripts |
| C-04 | TypeScript strict — no `any` on public surfaces |
| C-05 | New npm deps require explicit approval |
| C-06 | `test:unit` ≥250 passed on feature sprints |
| C-07 | Inngest Cloud signing keys required for prod jobs |
| C-08 | Redis + worker required for publish/analytics |

---

## 18.3 Business constraints

| ID | Constraint |
|----|------------|
| B-01 | Agency-led — no self-serve pilot UI |
| B-02 | Payment before Pit Crew (CL-036) |
| B-03 | Sales before provision script (CL-033) |
| B-04 | DeepSeek 55% gross margin rule |
| B-05 | Capital efficient — one-founder operator model |
| B-06 | Do not apply migration `000014` without A-GATE-003 |

---

## 18.4 Immutable boundaries (constitution)

- Reconciler-only SoR writes
- Dify runtime only — Inngest orchestrates
- Approval by risk tier, not confidence
- Zero regression on 003 publish/OAuth when touched

*Full list: [CONSTITUTION.md](../../CONSTITUTION.md) §11*
