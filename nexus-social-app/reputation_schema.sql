-- reputation_schema.sql

-- 1. Create listening_queries table
CREATE TABLE IF NOT EXISTS listening_queries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create mentions table
CREATE TABLE IF NOT EXISTS mentions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_id UUID REFERENCES listening_queries(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT,
  author_url TEXT,
  sentiment TEXT CHECK (sentiment IN ('Positive', 'Neutral', 'Negative')),
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create external_reviews table
CREATE TABLE IF NOT EXISTS external_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  author_name TEXT,
  review_text TEXT,
  reply_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE listening_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_reviews ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies using workspace_members join

-- listening_queries policies
CREATE POLICY "Users can view queries for their workspaces" ON listening_queries
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can modify queries for their workspaces" ON listening_queries
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- mentions policies (linked via query_id -> listening_queries -> workspace_id)
CREATE POLICY "Users can view mentions for their workspaces" ON mentions
  FOR SELECT USING (
    query_id IN (
      SELECT id FROM listening_queries WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can modify mentions for their workspaces" ON mentions
  FOR ALL USING (
    query_id IN (
      SELECT id FROM listening_queries WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- external_reviews policies
CREATE POLICY "Users can view reviews for their workspaces" ON external_reviews
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can modify reviews for their workspaces" ON external_reviews
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Note: In a real environment, you would also seed some mock data here.
