# Research: AI CMO PRD v3.0

## Key Architectural Decisions

| Topic | PRD Default | Sprint 12 Decision |
|-------|-------------|-------------------|
| Event bus | Upstash Kafka | Redis Streams (existing ioredis) |
| Orchestration | Inngest | Stub interface; Inngest when dep approved |
| AI runtime | Dify as orchestrator | Demoted; OpenRouter + Dify verify (003) remain agent runtime |
| Campaign storage | ai_cmo_campaigns | Metadata layer; posts remain SoR for publish |
| SoR writes | Direct agent writes | reconciler.ts mandatory path |
| Confidence routing | LLM self-score | Calibrated 4-factor formula + policy risk rules |

## SoR/SoI Separation

- **System of Record:** Supabase (`posts`, `post_analytics`, CRM integrations)
- **System of Intelligence:** Redis streams, future Qdrant vectors, agent context
- **Reconciler:** Sole write gateway for agent-generated mutations

## Event-Driven Replanning

Marketing events (competitor price change, algorithm update, viral spike, budget threshold, channel suspension, underperforming campaign) trigger orchestration replan — consumed by workflow skeleton in Sprint 12, wired to agents Sprint 13+.

## References

- Feature 003: real publishing provides external post IDs for attribution linkage
- MASTER_BLUEPRINT.md: Sprints 1–11 baseline
- PRD v3.0 transcript: `specs/004-ai-cmo-master-prd-v3/spec.md`
