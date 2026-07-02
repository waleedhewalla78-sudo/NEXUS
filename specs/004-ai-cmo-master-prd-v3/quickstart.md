# Quickstart: Sprint 12 AI CMO Foundation

## Prerequisites

- Feature 003 baseline running (`npm run verify:local` or equivalent)
- Redis available (`REDIS_URL` or localhost:6379)
- Supabase migrations applied through `20260624_000012_ai_cmo_foundation.sql` (after hierarchy `000011`)

## Apply Migration

```powershell
cd nexus-social-app
npm run db:migrate:local
# Or paste supabase/migrations/RUN_IN_SQL_EDITOR_004_sprint12.sql in SQL Editor (000011 + 000012 combined)
```

## Verify

```powershell
npm run typecheck
npm test
npm run build
npm run schema:verify
```

## Key Paths

| Component | Path |
|-----------|------|
| Event bus | `src/lib/events/marketing-event-bus.ts` |
| Reconciler | `src/lib/sync/reconciler.ts` |
| Orchestration stub | `src/lib/orchestration/` |
| Policy engine | `src/lib/governance/policy-engine.ts` |
| Calibrated confidence | `src/lib/evaluation/calibrated-confidence.ts` |
| Content quality | `src/lib/quality/content-quality-engine.ts` |

## Publish Test Event (requires Redis)

```typescript
import { createMarketingEventBus } from '@/lib/events/marketing-event-bus';

const bus = createMarketingEventBus();
await bus.publish({
  type: 'marketing.campaign.underperforming',
  workspaceId: '<uuid>',
  payload: { campaignId: '<uuid>', roi: 0.2 },
  idempotencyKey: 'test-1',
});
```

## Orchestration Note

Inngest is **not** installed. See `src/lib/orchestration/README.md` for wiring steps when approved.
