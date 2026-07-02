-- Phase 1: Database, Security & Server Actions
-- -------------------------------------------------
-- Ensure UUID extension is loaded
-- -------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------
-- Ensure core workspaces and users tables exist
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Drop old events table (if exists)
-- -------------------------------------------------
DROP TABLE IF EXISTS events;

-- -------------------------------------------------
-- 2. Ensure workspace_members table exists (idempotent)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS workspace_members (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
    workspace_id  uuid REFERENCES workspaces(id) ON DELETE CASCADE,
    role          text CHECK (role IN ('owner','admin','member')) NOT NULL,
    created_at    timestamp with time zone DEFAULT now(),
    updated_at    timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, workspace_id)
);

-- -------------------------------------------------
-- 3. Create posts table (using text[] for platforms)
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id  uuid REFERENCES workspaces(id) ON DELETE CASCADE,
    status        text CHECK (status IN ('draft','scheduled','published','failed')) NOT NULL DEFAULT 'draft',
    platforms     text[] NOT NULL,                 -- e.g., ['twitter','instagram']
    content       jsonb NOT NULL,                  -- { "text": "...", "media_urls": ["..."] }
    scheduled_at  timestamptz,
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now()
);

-- -------------------------------------------------
-- 4. Enable Row Level Security on posts
-- -------------------------------------------------
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Helper function to check membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(user_uuid uuid, ws_uuid uuid)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE user_id = user_uuid AND workspace_id = ws_uuid
    );
$$;

-- Policies using workspace_members join
CREATE POLICY "workspace can read posts"
    ON posts
    USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "workspace can insert posts"
    ON posts
    WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "workspace can update posts"
    ON posts
    USING (public.is_workspace_member(auth.uid(), workspace_id))
    WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "workspace can delete posts"
    ON posts
    USING (public.is_workspace_member(auth.uid(), workspace_id));

-- -------------------------------------------------
-- 5. Enable pg_cron and schedule publishing job
-- -------------------------------------------------
-- Enable the extension (requires superuser on the project; Supabase allows it via SQL)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job: every minute, set posts with scheduled_at <= now() and status='scheduled' to 'published'
-- Use a simple UPDATE statement. Cron syntax: minute hour day month day_of_week
SELECT cron.schedule('publish_scheduled_posts', '* * * * *', $$
    UPDATE posts
    SET status = 'published', updated_at = now()
    WHERE status = 'scheduled' AND scheduled_at <= now();
$$);

-- -------------------------------------------------
-- 6. Create storage bucket for media assets
-- -------------------------------------------------
-- This is normally done via Supabase UI or Storage API, but we can insert a bucket record.
INSERT INTO storage.buckets (id, name, public) VALUES ('media-assets', 'media-assets', FALSE)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------
-- 7. Storage RLS: allow members to upload/read files belonging to their workspace
-- -------------------------------------------------
-- We store workspace_id in the object's metadata JSON.
CREATE POLICY "media_read"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'media-assets' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.user_id = auth.uid()
              AND wm.workspace_id = (metadata->>'workspace_id')::uuid
        )
    );

CREATE POLICY "media_insert"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'media-assets' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.user_id = auth.uid()
              AND wm.workspace_id = (metadata->>'workspace_id')::uuid
        )
    );

CREATE POLICY "media_update"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'media-assets' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.user_id = auth.uid()
              AND wm.workspace_id = (metadata->>'workspace_id')::uuid
        )
    );

CREATE POLICY "media_delete"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'media-assets' AND
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.user_id = auth.uid()
              AND wm.workspace_id = (metadata->>'workspace_id')::uuid
        )
    );

-- End of Phase 1 setup script
