-- Feature 006 Phase 3 — Cost-to-serve monthly snapshots (FR-091 / T023)
-- Additive only. Idempotent.

CREATE TABLE IF NOT EXISTS cost_to_serve_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  mrr_usd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  llm_api_usd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  whatsapp_message_usd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bsp_fee_usd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  pit_crew_labor_usd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  infra_alloc_usd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  gross_margin_usd NUMERIC(14, 2) NOT NULL DEFAULT 0,
  gross_margin_pct NUMERIC(10, 6) NOT NULL DEFAULT 0,
  passes_margin_gate BOOLEAN NOT NULL DEFAULT false,
  stop_scale BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, period_month)
);

CREATE INDEX IF NOT EXISTS idx_cost_to_serve_snapshots_workspace_period
  ON cost_to_serve_snapshots (workspace_id, period_month DESC);

ALTER TABLE cost_to_serve_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY workspace_isolation_cost_to_serve_snapshots ON cost_to_serve_snapshots FOR ALL
    USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()))
    WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY service_role_cost_to_serve_snapshots ON cost_to_serve_snapshots FOR ALL
    USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
