/**
 * Feature 004 Phase 2 — Schema definitions for migration 000013 extensions.
 * Complements 000012 (foundation) and 000013 draft SQL — no conflicts with existing tables.
 *
 * These are TypeScript mirrors for application code and migration authoring.
 * Apply SQL via supabase/migrations/20260624_000013_ai_cmo_sprint14_draft.sql (+ phase-2 supplement).
 */

export const AI_CMO_PHASE_2_TABLES = {
  DECISION_LEDGER: 'ai_cmo_decision_ledger',
  AGENT_DECISIONS: 'ai_cmo_agent_decisions',
  EXPERIMENTS: 'ai_cmo_experiments',
  MEMORY_SUMMARIES: 'ai_cmo_memory_summaries',
} as const;

export type AiCmoPhase2TableName =
  (typeof AI_CMO_PHASE_2_TABLES)[keyof typeof AI_CMO_PHASE_2_TABLES];

export type AiCmoDecisionLedgerRow = {
  id: string;
  workspace_id: string;
  decision_id: string;
  agent_name: string;
  decision_type: string | null;
  rationale: Record<string, unknown>;
  expected_kpis: Record<string, unknown>;
  actual_kpis: Record<string, unknown>;
  variance: Record<string, unknown>;
  human_override: boolean;
  lesson_learned: string | null;
  created_at: string;
  measured_at: string | null;
};

export type AiCmoAgentDecisionRow = {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  agent_name: string;
  input_hash: string;
  input_summary: Record<string, unknown>;
  output: Record<string, unknown>;
  model_used: string | null;
  token_count: number | null;
  latency_ms: number | null;
  created_at: string;
};

export type AiCmoExperimentRow = {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  experiment_key: string;
  variant: string;
  hypothesis: string | null;
  metrics: Record<string, unknown>;
  status: 'draft' | 'running' | 'concluded';
  winner_variant: string | null;
  started_at: string | null;
  concluded_at: string | null;
  created_at: string;
};

export type AiCmoMemorySummaryRow = {
  id: string;
  workspace_id: string;
  brand_id: string | null;
  summary_period: 'weekly' | 'monthly';
  summary_text: string;
  learning_ids: string[];
  metrics: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export const AI_CMO_PHASE_2_RLS_POLICIES = {
  DECISION_LEDGER: 'Members manage ai_cmo_decision_ledger',
  AGENT_DECISIONS: 'Members manage ai_cmo_agent_decisions',
  EXPERIMENTS: 'Members manage ai_cmo_experiments',
  MEMORY_SUMMARIES: 'Members manage ai_cmo_memory_summaries',
} as const;

/** SQL supplement for ai_cmo_memory_summaries (not in 000013 draft). */
export const AI_CMO_MEMORY_SUMMARIES_DDL = `
CREATE TABLE IF NOT EXISTS ai_cmo_memory_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  summary_period TEXT NOT NULL CHECK (summary_period IN ('weekly', 'monthly')),
  summary_text TEXT NOT NULL,
  learning_ids UUID[] NOT NULL DEFAULT '{}',
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cmo_memory_summaries_workspace
  ON ai_cmo_memory_summaries(workspace_id, summary_period, updated_at DESC);

ALTER TABLE ai_cmo_memory_summaries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members manage ai_cmo_memory_summaries" ON ai_cmo_memory_summaries FOR ALL USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

export const aiCmoPhase2SchemaUtils = {
  AI_CMO_PHASE_2_TABLES,
  AI_CMO_PHASE_2_RLS_POLICIES,
  AI_CMO_MEMORY_SUMMARIES_DDL,
};
