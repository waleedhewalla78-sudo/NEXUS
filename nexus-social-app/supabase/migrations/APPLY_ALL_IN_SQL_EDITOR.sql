-- =============================================================================
-- Nexus Social Platform — apply all migrations in Supabase SQL Editor
-- Project: https://supabase.com/dashboard/project/lnlzxaqockpjezxskmnb/sql/new
--
-- Paste this entire file into the SQL Editor and run once (fresh project),
-- OR run each section individually in filename order (000001 -> 000008).
-- Safe to re-run: migrations use IF NOT EXISTS / duplicate_object guards.
-- =============================================================================

-- === 20260623_000001_baseline.sql ===

-- Baseline: core multi-tenant tables (from essential_bootstrap.sql)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  branding JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner','admin','member')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, workspace_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('draft','scheduled','published','failed')) NOT NULL DEFAULT 'draft',
  platforms TEXT[] NOT NULL DEFAULT '{}',
  content JSONB NOT NULL DEFAULT '{"text":""}'::jsonb,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.is_workspace_member(user_uuid uuid, ws_uuid uuid)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE user_id = user_uuid AND workspace_id = ws_uuid
  );
$$;

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "workspace can read posts" ON posts
    FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "workspace can insert posts" ON posts
    FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "workspace can update posts" ON posts
    FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "workspace can delete posts" ON posts
    FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "workspaces_insert_authenticated" ON workspaces
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "workspaces_select_member" ON workspaces FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspaces.id AND wm.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "workspace_members_select_own" ON workspace_members
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "workspace_members_insert_own" ON workspace_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'::jsonb;

-- === 20260623_000002_ai_billing.sql ===

-- AI agent configs, automations, credit ledger
CREATE TABLE IF NOT EXISTS ai_agent_configs (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  dify_app_id TEXT NOT NULL DEFAULT 'local-dev-app',
  dify_dataset_id TEXT NOT NULL DEFAULT 'local-dev-dataset',
  persona_name TEXT DEFAULT 'Support Agent',
  system_prompt_override TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_globally_disabled BOOLEAN DEFAULT FALSE,
  traffic_allocation_percentage INT DEFAULT 100 CHECK (traffic_allocation_percentage >= 0 AND traffic_allocation_percentage <= 100),
  daily_token_limit INT DEFAULT 100000,
  dify_app_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_agent_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage ai_agent_configs for their workspaces" ON ai_agent_configs
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = ai_agent_configs.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS automation_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('comment', 'dm', 'mention')),
  flow_json JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
  activepieces_flow_id TEXT,
  is_active BOOLEAN DEFAULT false,
  execution_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE automation_flows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members can view automation flows" ON automation_flows
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = automation_flows.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS ai_credit_ledger (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  total_credits INTEGER NOT NULL DEFAULT 1000,
  used_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_credit_ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members can view their credits" ON ai_credit_ledger
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = ai_credit_ledger.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE ai_credit_ledger DROP CONSTRAINT IF EXISTS check_positive_credits;
ALTER TABLE ai_credit_ledger ADD CONSTRAINT check_positive_credits CHECK (total_credits >= used_credits);

CREATE OR REPLACE FUNCTION public.deduct_ai_credits(p_workspace_id UUID, p_amount INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE ai_credit_ledger
    SET used_credits = used_credits + p_amount,
        updated_at = NOW()
    WHERE workspace_id = p_workspace_id
      AND (total_credits - used_credits) >= p_amount;

    IF FOUND THEN
        RETURN TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ai_credit_ledger WHERE workspace_id = p_workspace_id) THEN
        INSERT INTO ai_credit_ledger (workspace_id, total_credits, used_credits)
        VALUES (p_workspace_id, 1000, p_amount);
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_execution_count(flow_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE automation_flows
  SET execution_count = execution_count + 1,
      updated_at = NOW()
  WHERE id = flow_id;
END;
$$;

-- Supporting tables referenced by the app
CREATE TABLE IF NOT EXISTS chatwoot_inbox_workspace_map (
  chatwoot_inbox_id INTEGER PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ai_bot_user_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chatwoot_inbox_workspace_map ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can access mapping for their workspaces" ON chatwoot_inbox_workspace_map
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = chatwoot_inbox_workspace_map.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS workspace_sso_configs (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'saml' CHECK (provider IN ('saml', 'oauth')),
  oauth_client_id TEXT,
  oauth_client_secret TEXT,
  metadata_url TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workspace_sso_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage workspace SSO config" ON workspace_sso_configs
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_sso_configs.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role IN ('owner', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === 20260623_000003_reputation.sql ===

-- Reputation: listening, mentions, external reviews
CREATE TABLE IF NOT EXISTS listening_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  query_type TEXT DEFAULT 'keyword',
  platforms TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID REFERENCES listening_queries(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT,
  author_url TEXT,
  sentiment TEXT CHECK (sentiment IN ('Positive', 'Neutral', 'Negative')),
  published_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  author_name TEXT,
  review_text TEXT,
  reply_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE listening_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view queries for their workspaces" ON listening_queries
    FOR ALL USING (
      workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view mentions for their workspaces" ON mentions
    FOR SELECT USING (
      query_id IN (
        SELECT id FROM listening_queries WHERE workspace_id IN (
          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view external reviews for their workspaces" ON external_reviews
    FOR ALL USING (
      workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === 20260623_000004_social_connections.sql ===

-- OAuth social connections + publish columns on posts
CREATE TABLE IF NOT EXISTS workspace_social_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'x')),
  account_id TEXT NOT NULL,
  account_name TEXT,
  account_handle TEXT,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT,
  token_iv TEXT NOT NULL,
  token_tag TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_social_connections_active_unique
  ON workspace_social_connections (workspace_id, platform, account_id)
  WHERE disconnected_at IS NULL;

CREATE INDEX IF NOT EXISTS workspace_social_connections_workspace_idx
  ON workspace_social_connections (workspace_id);

CREATE INDEX IF NOT EXISTS workspace_social_connections_expiry_idx
  ON workspace_social_connections (platform, token_expires_at)
  WHERE disconnected_at IS NULL;

ALTER TABLE workspace_social_connections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members manage social connections" ON workspace_social_connections
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_social_connections.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS publish_error TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS external_post_id TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS external_permalink TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES workspace_social_connections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_scheduled_publish_idx
  ON posts (scheduled_at)
  WHERE status = 'scheduled';

-- === 20260623_000005_post_analytics.sql ===

-- Per-post analytics synced from platform APIs
CREATE TABLE IF NOT EXISTS post_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  external_post_id TEXT NOT NULL,
  impressions BIGINT,
  reach BIGINT,
  clicks BIGINT,
  likes BIGINT,
  comments BIGINT,
  shares BIGINT,
  saves BIGINT,
  engagement_rate NUMERIC(8,4),
  raw_payload JSONB,
  synced_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id, platform, external_post_id)
);

CREATE INDEX IF NOT EXISTS post_analytics_workspace_synced_idx
  ON post_analytics (workspace_id, synced_at DESC);

ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members view post analytics" ON post_analytics
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = post_analytics.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === 20260623_000006_notify_pgrst.sql ===

-- Refresh PostgREST schema cache after migrations
NOTIFY pgrst, 'reload schema';

-- === 20260623_000007_analytics_rpc.sql ===

-- Extend get_workspace_analytics to aggregate ingested post_analytics metrics
CREATE OR REPLACE FUNCTION public.get_workspace_analytics(p_workspace_id uuid)
RETURNS TABLE (
    total_posts bigint,
    published_posts bigint,
    draft_posts bigint,
    posts_by_platform jsonb,
    posts_over_time jsonb,
    total_impressions bigint,
    total_reach bigint,
    total_engagement bigint,
    engagement_by_platform jsonb,
    engagement_over_time jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    count(*)::bigint                                          AS total_posts,
    count(*) FILTER (WHERE p.status = 'published')::bigint    AS published_posts,
    count(*) FILTER (WHERE p.status = 'draft')::bigint        AS draft_posts,

    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('platform', sub.platform, 'count', sub.cnt)
        )
        FROM (
          SELECT unnest(p2.platforms) AS platform, count(*) AS cnt
          FROM posts p2
          WHERE p2.workspace_id = p_workspace_id
          GROUP BY platform
          ORDER BY cnt DESC
        ) sub
      ),
      '[]'::jsonb
    ) AS posts_by_platform,

    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('date', sub.day::text, 'count', sub.cnt)
          ORDER BY sub.day
        )
        FROM (
          SELECT date_trunc('day', p3.created_at)::date AS day, count(*) AS cnt
          FROM posts p3
          WHERE p3.workspace_id = p_workspace_id
            AND p3.created_at >= now() - interval '30 days'
          GROUP BY day
          ORDER BY day
        ) sub
      ),
      '[]'::jsonb
    ) AS posts_over_time,

    COALESCE((
      SELECT sum(COALESCE(pa.impressions, 0))::bigint
      FROM post_analytics pa
      WHERE pa.workspace_id = p_workspace_id
    ), 0)::bigint AS total_impressions,

    COALESCE((
      SELECT sum(COALESCE(pa.reach, 0))::bigint
      FROM post_analytics pa
      WHERE pa.workspace_id = p_workspace_id
    ), 0)::bigint AS total_reach,

    COALESCE((
      SELECT sum(
        COALESCE(pa.likes, 0) +
        COALESCE(pa.comments, 0) +
        COALESCE(pa.shares, 0) +
        COALESCE(pa.saves, 0)
      )::bigint
      FROM post_analytics pa
      WHERE pa.workspace_id = p_workspace_id
    ), 0)::bigint AS total_engagement,

    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'platform', sub.platform,
            'impressions', sub.impressions,
            'engagement', sub.engagement
          )
        )
        FROM (
          SELECT
            pa.platform,
            sum(COALESCE(pa.impressions, 0)) AS impressions,
            sum(
              COALESCE(pa.likes, 0) +
              COALESCE(pa.comments, 0) +
              COALESCE(pa.shares, 0) +
              COALESCE(pa.saves, 0)
            ) AS engagement
          FROM post_analytics pa
          WHERE pa.workspace_id = p_workspace_id
          GROUP BY pa.platform
          ORDER BY impressions DESC
        ) sub
      ),
      '[]'::jsonb
    ) AS engagement_by_platform,

    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'date', sub.day::text,
            'impressions', sub.impressions,
            'engagement', sub.engagement
          )
          ORDER BY sub.day
        )
        FROM (
          SELECT
            date_trunc('day', pa.synced_at)::date AS day,
            sum(COALESCE(pa.impressions, 0)) AS impressions,
            sum(
              COALESCE(pa.likes, 0) +
              COALESCE(pa.comments, 0) +
              COALESCE(pa.shares, 0) +
              COALESCE(pa.saves, 0)
            ) AS engagement
          FROM post_analytics pa
          WHERE pa.workspace_id = p_workspace_id
            AND pa.synced_at IS NOT NULL
            AND pa.synced_at >= now() - interval '30 days'
          GROUP BY day
          ORDER BY day
        ) sub
      ),
      '[]'::jsonb
    ) AS engagement_over_time

  FROM posts p
  WHERE p.workspace_id = p_workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_analytics(uuid) TO anon, authenticated;

-- === 20260623_000008_missing_tables.sql ===

-- Persistent user notifications
CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  href TEXT NOT NULL DEFAULT '/',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, workspace_id, id)
);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users read own notifications" ON user_notifications
    FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Pending team email invites
CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workspace_id, email)
);

ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage workspace invites" ON workspace_invites
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_invites.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role IN ('owner', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Custom PDF report layouts
CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Report',
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedule TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members manage custom reports" ON custom_reports
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = custom_reports.workspace_id
          AND wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === PostgREST schema reload (after final migration) ===
NOTIFY pgrst, 'reload schema';
