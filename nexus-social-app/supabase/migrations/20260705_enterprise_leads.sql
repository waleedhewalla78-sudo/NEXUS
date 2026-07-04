-- Sprint 2 Loop 1.1 — Enterprise inbound leads (Diligent AI landing page + webhooks)
-- Idempotent apply: safe in SQL Editor
-- Requires: workspaces, workspace_members, account_intent_scores (ABM)

CREATE TABLE IF NOT EXISTS enterprise_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('website_form', 'whatsapp', 'meta_ads', 'referral')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'closed_won', 'closed_lost')),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  message TEXT,
  abm_account_id UUID REFERENCES account_intent_scores(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_leads_workspace_status
  ON enterprise_leads (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_enterprise_leads_workspace_created
  ON enterprise_leads (workspace_id, created_at DESC);

ALTER TABLE enterprise_leads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Workspace isolation for enterprise_leads" ON enterprise_leads FOR ALL
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
  CREATE POLICY service_role_enterprise_leads ON enterprise_leads FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
