-- Sprint 7 — Intelligence ingestion & executive briefs (agency funnel model)
-- Idempotent. No Meta/GA4 native sync workers.

CREATE TABLE IF NOT EXISTS intelligence_ingests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('ga4', 'meta_ads', 'manual_csv', 'webhook', 'other')),
  raw_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  row_count INT NOT NULL DEFAULT 0,
  brief_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (brief_status IN ('pending', 'generated', 'failed')),
  anomalies JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intelligence_ingests_workspace_created
  ON intelligence_ingests (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_intelligence_ingests_brief_status
  ON intelligence_ingests (workspace_id, brief_status);

CREATE TABLE IF NOT EXISTS intelligence_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ingest_ids UUID[] NOT NULL DEFAULT '{}',
  brief_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready'
    CHECK (status IN ('ready', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intelligence_briefs_workspace_created
  ON intelligence_briefs (workspace_id, created_at DESC);

ALTER TABLE intelligence_ingests ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_briefs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY workspace_isolation_intelligence_ingests ON intelligence_ingests FOR ALL
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
  CREATE POLICY workspace_isolation_intelligence_briefs ON intelligence_briefs FOR ALL
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
  CREATE POLICY service_role_intelligence_ingests ON intelligence_ingests FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY service_role_intelligence_briefs ON intelligence_briefs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
