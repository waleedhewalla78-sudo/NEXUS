-- Meta App Review gate for Facebook/Instagram production publishing (Feature 003 T002)
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS meta_app_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (meta_app_review_status IN ('pending', 'approved', 'rejected'));

COMMENT ON COLUMN workspaces.meta_app_review_status IS
  'Business gate: Facebook/Instagram publish blocked until manually set to approved after Meta App Review.';

NOTIFY pgrst, 'reload schema';
