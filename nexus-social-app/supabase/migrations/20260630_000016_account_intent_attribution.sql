-- Feature 006 — Enterprise ABM: account intent scores + attribution reports
-- Idempotent; safe to re-run in SQL Editor.

CREATE TABLE IF NOT EXISTS account_intent_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  organization_id UUID,
  domain TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'general',
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'intent_provider',
  scored_month TEXT NOT NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, domain, topic, scored_month)
);

CREATE INDEX IF NOT EXISTS idx_account_intent_workspace_month
  ON account_intent_scores (workspace_id, scored_month DESC, score DESC);

CREATE INDEX IF NOT EXISTS idx_account_intent_domain
  ON account_intent_scores (workspace_id, domain);

CREATE TABLE IF NOT EXISTS attribution_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ai_cmo_campaigns(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL
    CHECK (report_type IN ('first_touch', 'last_touch', 'linear', 'nightly_summary', 'crm_closed_won')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  crm_deal_value DECIMAL(12, 2),
  signature_hmac TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attribution_reports_workspace
  ON attribution_reports (workspace_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS crm_activity_mirror (
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

CREATE INDEX IF NOT EXISTS idx_crm_activity_workspace
  ON crm_activity_mirror (workspace_id, occurred_at DESC);

ALTER TABLE account_intent_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activity_mirror ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members manage account_intent_scores" ON account_intent_scores FOR ALL
    USING (public.is_workspace_member(auth.uid(), workspace_id))
    WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage attribution_reports" ON attribution_reports FOR ALL
    USING (public.is_workspace_member(auth.uid(), workspace_id))
    WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members manage crm_activity_mirror" ON crm_activity_mirror FOR ALL
    USING (public.is_workspace_member(auth.uid(), workspace_id))
    WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role account_intent_scores" ON account_intent_scores FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role attribution_reports" ON attribution_reports FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role crm_activity_mirror" ON crm_activity_mirror FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
