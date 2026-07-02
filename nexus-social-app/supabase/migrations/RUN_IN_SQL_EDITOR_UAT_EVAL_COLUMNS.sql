-- Paste in Supabase SQL Editor if live integration fails on:
--   "Could not find the 'auto_rejected' column of 'ai_cmo_evaluations'"
-- Safe to re-run (IF NOT EXISTS). Then: NOTIFY pgrst, 'reload schema';

ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS uniqueness_score FLOAT
  CHECK (uniqueness_score IS NULL OR (uniqueness_score >= 0 AND uniqueness_score <= 1));
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS eeat_score FLOAT
  CHECK (eeat_score IS NULL OR (eeat_score >= 0 AND eeat_score <= 1));
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS engagement_score FLOAT
  CHECK (engagement_score IS NULL OR (engagement_score >= 0 AND engagement_score <= 1));
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS platform_compliance_score FLOAT
  CHECK (platform_compliance_score IS NULL OR (platform_compliance_score >= 0 AND platform_compliance_score <= 1));
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS auto_rejected BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS rejection_reasons TEXT[] DEFAULT '{}';
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS evaluator_model TEXT;
ALTER TABLE ai_cmo_evaluations ADD COLUMN IF NOT EXISTS calibrated_confidence FLOAT
  CHECK (calibrated_confidence IS NULL OR (calibrated_confidence >= 0 AND calibrated_confidence <= 1));

ALTER TABLE ai_cmo_campaigns ADD COLUMN IF NOT EXISTS calibrated_confidence FLOAT
  CHECK (calibrated_confidence IS NULL OR (calibrated_confidence >= 0 AND calibrated_confidence <= 1));

NOTIFY pgrst, 'reload schema';
