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
