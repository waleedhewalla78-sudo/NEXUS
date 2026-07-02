-- sprint9_schema_part2.sql

-- =========================================================================
-- 4. DATA WAREHOUSING (REVERSE ETL)
-- =========================================================================

CREATE TABLE data_warehouse_destinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'snowflake', 'bigquery', 'postgres', 'redshift'
  encrypted_credentials JSONB NOT NULL, -- Never exposed to client, decrypted on server
  sync_frequency TEXT DEFAULT 'nightly', -- 'nightly', 'hourly'
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE data_warehouse_destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage data warehouse destinations"
ON data_warehouse_destinations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = data_warehouse_destinations.workspace_id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role = 'admin'
  )
);
