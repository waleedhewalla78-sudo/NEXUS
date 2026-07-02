-- Sprint 11: Launch Hardening and User Activation

-- 1. Add onboarding tracking flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;
