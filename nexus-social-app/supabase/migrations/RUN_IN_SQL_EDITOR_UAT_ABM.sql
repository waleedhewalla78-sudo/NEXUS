-- Paste in Supabase SQL Editor (alias of 20260630_enterprise_abm_tables.sql)

-- Enterprise ABM tables — account intent + channel attribution (CTO demo / RLS-protected)
-- Idempotent. Safe to paste in Supabase SQL Editor.
-- Replaces prior ABM draft schema when tables were not yet applied.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop legacy draft shape if present (tables were never populated in UAT)
DROP TABLE IF EXISTS crm_activity_mirror CASCADE;
DROP TABLE IF EXISTS attribution_reports CASCADE;
DROP TABLE IF EXISTS account_intent_scores CASCADE;

CREATE TABLE account_intent_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'General',
  intent_score INTEGER NOT NULL CHECK (intent_score >= 1 AND intent_score <= 100),
  buyer_stage TEXT NOT NULL CHECK (buyer_stage IN ('awareness', 'consideration', 'decision')),
  topics TEXT[] NOT NULL DEFAULT '{}',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, domain)
);

CREATE INDEX idx_account_intent_workspace_score
  ON account_intent_scores (workspace_id, intent_score DESC);

CREATE INDEX idx_account_intent_buyer_stage
  ON account_intent_scores (workspace_id, buyer_stage);

CREATE TABLE attribution_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  channel TEXT NOT NULL,
  touches INTEGER NOT NULL DEFAULT 0 CHECK (touches >= 0),
  attributed_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, month, channel)
);

CREATE INDEX idx_attribution_reports_workspace_month
  ON attribution_reports (workspace_id, month DESC);

CREATE TABLE crm_activity_mirror (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  crm_platform TEXT NOT NULL CHECK (crm_platform IN ('hubspot', 'salesforce', 'generic')),
  account_id TEXT NOT NULL,
  account_domain TEXT,
  activity_type TEXT NOT NULL,
  deal_value DECIMAL(12, 2),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_activity_workspace ON crm_activity_mirror (workspace_id, occurred_at DESC);

ALTER TABLE account_intent_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activity_mirror ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY workspace_isolation_account_intent ON account_intent_scores FOR ALL
    USING (
      workspace_id IN (
        SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
      )
    )
    WITH CHECK (
      workspace_id IN (
        SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY workspace_isolation_attribution ON attribution_reports FOR ALL
    USING (
      workspace_id IN (
        SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
      )
    )
    WITH CHECK (
      workspace_id IN (
        SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY workspace_isolation_crm_mirror ON crm_activity_mirror FOR ALL
    USING (
      workspace_id IN (
        SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
      )
    )
    WITH CHECK (
      workspace_id IN (
        SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY service_role_account_intent ON account_intent_scores FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY service_role_attribution ON attribution_reports FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY service_role_crm_mirror ON crm_activity_mirror FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
