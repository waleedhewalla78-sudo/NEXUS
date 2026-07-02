-- enterprise_schema.sql

-- =========================================================================
-- 1. NEXUS PAGES (LINK-IN-BIO)
-- =========================================================================

CREATE TABLE nexus_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  blocks JSONB NOT NULL DEFAULT '[]', -- Array of {type: 'header' | 'link' | 'image', content: {...}}
  theme JSONB DEFAULT '{}', -- Custom colors/logo overrides
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Public can read published pages
ALTER TABLE nexus_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published pages"
ON nexus_pages FOR SELECT
USING (is_published = true);

-- RLS: Workspace members can manage their pages
CREATE POLICY "Members can manage nexus_pages"
ON nexus_pages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = nexus_pages.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE TABLE nexus_page_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES nexus_pages(id) ON DELETE CASCADE,
  link_url TEXT NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT now(),
  ip_hash TEXT -- Optional anonymized tracking
);

-- Public can insert clicks (fire and forget)
ALTER TABLE nexus_page_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert clicks"
ON nexus_page_clicks FOR INSERT
WITH CHECK (true);

-- Workspace members can view clicks
CREATE POLICY "Members can view clicks"
ON nexus_page_clicks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM nexus_pages 
    JOIN workspace_members ON workspace_members.workspace_id = nexus_pages.workspace_id
    WHERE nexus_pages.id = nexus_page_clicks.page_id 
    AND workspace_members.user_id = auth.uid()
  )
);


-- =========================================================================
-- 2. ENTERPRISE AUDIT LOGS (APPEND ONLY)
-- =========================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Null if system action
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- STRICT RLS: Append-only
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can INSERT (if our server logic allows)
CREATE POLICY "Members can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = audit_logs.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

-- ONLY admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = audit_logs.workspace_id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role = 'admin'
  )
);

-- NO POLICY FOR UPDATE OR DELETE. This makes them immutable by users.


-- =========================================================================
-- 3. SAML SSO MAPPING (Instructions & Helpers)
-- =========================================================================
-- To use Supabase SAML SSO:
-- 1. Use the Supabase CLI/Dashboard to register your SAML provider (IdP).
-- 2. In your IdP (Okta, Azure), map roles as custom attributes.
-- 3. You can create a database trigger that runs on user sign up/in to read 
--    the SAML claims from `auth.users.raw_app_meta_data` and automatically 
--    insert them into `workspace_members` with the correct `role`.
