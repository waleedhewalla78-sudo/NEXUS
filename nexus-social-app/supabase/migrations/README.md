# Supabase Migration Order (Feature 003)

Apply migrations **in filename order** under `supabase/migrations/`.

### Supabase SQL Editor (one-shot)

For the linked remote project, open [SQL Editor](https://supabase.com/dashboard/project/lnlzxaqockpjezxskmnb/sql/new) and either:

1. Paste and run the entire **`APPLY_ALL_IN_SQL_EDITOR.sql`** file (all migrations in order), or
2. Run each numbered `20260623_00000N_*.sql` file individually in order (000001 → 000007).

`APPLY_ALL_IN_SQL_EDITOR.sql` is generated from the individual migration files and ends with `NOTIFY pgrst, 'reload schema'` so PostgREST picks up schema changes after the final migration.

| Order | File | Purpose |
|-------|------|---------|
| 1 | `20260623_000001_baseline.sql` | workspaces, users, members, posts + RLS |
| 2 | `20260623_000002_ai_billing.sql` | ai_agent_configs, automation_flows, ai_credit_ledger |
| 3 | `20260623_000003_reputation.sql` | listening_queries, mentions, external_reviews |
| 4 | `20260623_000004_social_connections.sql` | workspace_social_connections, posts publish columns |
| 5 | `20260623_000005_post_analytics.sql` | post_analytics metrics table |
| 6 | `20260623_000006_notify_pgrst.sql` | `NOTIFY pgrst, 'reload schema'` |
| 7 | `20260623_000007_analytics_rpc.sql` | `get_workspace_analytics` joins post_analytics |
| 8 | `20260623_000008_missing_tables.sql` | user_notifications, workspace_invites, custom_reports, SSO |
| 9 | `20260623_000009_migration_status.sql` | enterprise migration job tracking + `NOTIFY pgrst` |
| 10 | `20260623_000010_meta_app_review.sql` | `workspaces.meta_app_review_status` Meta publish gate |

### PostgREST reload after SQL Editor

If you apply migrations manually in the Supabase SQL Editor and PostgREST still returns PGRST205:

```sql
NOTIFY pgrst, 'reload schema';
```

Or re-run `PATCH_MIGRATION_STATUS_NOTIFY.sql` (idempotent) for `migration_status` only.

## Commands

```bash
npm run db:link             # one-time: npx supabase link (reads project ref from .env.local)
npm run db:migrate          # npx supabase db push (linked remote project)
npm run db:reset            # npx supabase db reset (local Supabase stack)
npm run db:migrate:local    # psql apply — uses DATABASE_URL env, .env.local, or -DatabaseUrl
npm run schema:verify       # probe required tables via PostgREST
```

Legacy root-level `*_schema.sql` files are **deprecated** — do not add new schema outside `supabase/migrations/`.

The older `sprint12_competitive_gaps.sql` is superseded by `20260623_000002_ai_billing.sql` for fresh installs.
