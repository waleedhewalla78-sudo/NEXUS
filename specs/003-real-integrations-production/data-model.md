# Data Model: Real Integrations & Production Readiness (Epic 1–3)



Schema additions and alterations for feature `003-real-integrations-production`. Apply via ordered Supabase CLI migrations.



> Merged from `specs/003-production-saas/data-model.md`.



**RLS pattern (all new tables):**



```sql

CREATE POLICY "workspace_members_select" ON <table>

  FOR SELECT USING (

    EXISTS (

      SELECT 1 FROM workspace_members wm

      WHERE wm.workspace_id = <table>.workspace_id

        AND wm.user_id = auth.uid()

    )

  );

```



Service role bypasses RLS for worker jobs.



---



## `workspace_social_connections`



Stores OAuth credentials per workspace per platform account.



| Column | Type | Notes |

|--------|------|-------|

| id | UUID PK | `gen_random_uuid()` |

| workspace_id | UUID FK → workspaces | Required |

| platform | TEXT | `facebook`, `instagram`, `linkedin`, `x` |

| account_id | TEXT | Platform-native ID (Page ID, org URN, X user id) |

| account_name | TEXT | Display name |

| account_handle | TEXT nullable | @handle or Page slug |

| access_token_enc | TEXT | AES-256-GCM ciphertext (base64) |

| refresh_token_enc | TEXT nullable | Encrypted refresh token |

| token_iv | TEXT | IV for access token |

| token_expires_at | TIMESTAMPTZ nullable | Proactive refresh |

| scopes | TEXT[] | Granted OAuth scopes |

| metadata | JSONB | Platform-specific extras (page access tokens for Meta) |

| connected_at | TIMESTAMPTZ | |

| disconnected_at | TIMESTAMPTZ nullable | Soft disconnect |

| created_at / updated_at | TIMESTAMPTZ | |



**Unique:** `(workspace_id, platform, account_id)` where `disconnected_at IS NULL`



**Indexes:** `(workspace_id)`, `(platform, token_expires_at)` for refresh job



---



## Alterations: `posts`



| Column | Type | Notes |

|--------|------|-------|

| publish_error | TEXT nullable | Last failure message |

| external_post_id | TEXT nullable | Platform post ID |

| external_permalink | TEXT nullable | URL to live post |

| published_at | TIMESTAMPTZ nullable | Actual publish time |

| connection_id | UUID FK nullable → workspace_social_connections | Which account published |



**Index:** `(status, scheduled_at)` WHERE status = 'scheduled' — publish worker query



---



## `post_analytics`



Per-post metrics synced from platform APIs.



| Column | Type | Notes |

|--------|------|-------|

| id | UUID PK | |

| workspace_id | UUID FK | Denormalized for RLS |

| post_id | UUID FK → posts | |

| platform | TEXT | Matches post platform slice |

| external_post_id | TEXT | Denormalized for sync idempotency |

| impressions | BIGINT nullable | |

| reach | BIGINT nullable | |

| clicks | BIGINT nullable | |

| likes | BIGINT nullable | |

| comments | BIGINT nullable | |

| shares | BIGINT nullable | |

| saves | BIGINT nullable | Instagram |

| engagement_rate | NUMERIC(8,4) nullable | Computed on sync |

| raw_payload | JSONB nullable | Full API response for debug |

| synced_at | TIMESTAMPTZ | Last successful sync |

| sync_error | TEXT nullable | Last sync failure |

| created_at / updated_at | TIMESTAMPTZ | |



**Unique:** `(post_id, platform, external_post_id)`



**Index:** `(workspace_id, synced_at DESC)`



---



## `post_publish_attempts` (optional, recommended)



Audit trail for publish retries.



| Column | Type | Notes |

|--------|------|-------|

| id | UUID PK | |

| post_id | UUID FK | |

| platform | TEXT | |

| attempt_number | INT | |

| status | TEXT | `success`, `failed`, `retrying` |

| error_message | TEXT nullable | |

| response_payload | JSONB nullable | |

| created_at | TIMESTAMPTZ | |



---



## Reputation tables (migrate from scattered SQL)



### `listening_queries`



| Column | Type | Notes |

|--------|------|-------|

| id | UUID PK | |

| workspace_id | UUID FK | |

| query_type | TEXT | `keyword`, `hashtag`, `handle`, `competitor_url` |

| query_value | TEXT | Search term or URL |

| platforms | TEXT[] | Where to listen |

| is_active | BOOLEAN | |

| created_at | TIMESTAMPTZ | |



### `mentions`



| Column | Type | Notes |

|--------|------|-------|

| id | UUID PK | |

| query_id | UUID FK → listening_queries | |

| platform | TEXT | |

| author_handle | TEXT nullable | |

| content | TEXT | |

| url | TEXT nullable | |

| sentiment | TEXT nullable | `positive`, `neutral`, `negative` |

| published_at | TIMESTAMPTZ | |

| ingested_at | TIMESTAMPTZ | |



### `external_reviews`



| Column | Type | Notes |

|--------|------|-------|

| id | UUID PK | |

| workspace_id | UUID FK | |

| source | TEXT | `google`, `trustpilot`, `yelp`, etc. |

| external_id | TEXT | Source-native review ID |

| rating | NUMERIC(2,1) nullable | |

| review_text | TEXT | |

| reviewer_name | TEXT nullable | |

| reply_text | TEXT nullable | |

| status | TEXT | `pending`, `responded` |

| created_at | TIMESTAMPTZ | |



**Unique:** `(workspace_id, source, external_id)`



---



## Deprecation: `workspaces.branding.social_accounts`



After migration, Settings UI reads/writes `workspace_social_connections` for `connected` state. Keep `branding.social_accounts` read-only fallback during transition (one release), then remove writes.



---



## Migration notify (Epic 3)



```sql

-- 20260623_000006_notify_pgrst.sql

NOTIFY pgrst, 'reload schema';

```



---



## Entity relationships



```text

workspaces 1──* workspace_social_connections

workspaces 1──* posts

posts 1──* post_analytics

posts 0──* post_publish_attempts

posts *──0..1 workspace_social_connections (connection_id)

workspaces 1──* listening_queries 1──* mentions

workspaces 1──* external_reviews

```



---



## RPC updates



### `get_workspace_analytics(p_workspace_id UUID)`



Extend to join `post_analytics` for engagement totals:



- `total_impressions`, `total_engagement`, `engagement_by_platform`

- Remove dependency on fabricated prediction data for MVP



---



## Storage



No new buckets. Existing Supabase Storage for post media unchanged.


