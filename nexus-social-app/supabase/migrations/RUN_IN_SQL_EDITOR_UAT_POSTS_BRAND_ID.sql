-- Optional: add brand_id to posts if link-post step fails with schema cache error.
-- Safe to re-run.

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_brand_id ON posts(brand_id);

NOTIFY pgrst, 'reload schema';
