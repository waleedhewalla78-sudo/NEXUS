-- Migration: Sprint 12 Competitive Gaps (Sentiment Analysis & CSAT)

-- 1. Sentiment Metrics Table
CREATE TABLE sentiment_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    sentiment_score TEXT NOT NULL CHECK (sentiment_score IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'URGENT')),
    user_query TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for Sentiment Metrics
ALTER TABLE sentiment_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their workspace sentiment" ON sentiment_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_members.workspace_id = sentiment_metrics.workspace_id 
            AND workspace_members.user_id = auth.uid()
        )
    );

-- 2. CSAT Scores Table
CREATE TABLE csat_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for CSAT Scores
ALTER TABLE csat_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their workspace CSAT" ON csat_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_members.workspace_id = csat_scores.workspace_id 
            AND workspace_members.user_id = auth.uid()
        )
    );

-- 3. Credit Ledger Check Constraint
-- Ensure ai_credit_ledger exists before altering
CREATE TABLE IF NOT EXISTS ai_credit_ledger (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    total_credits INTEGER NOT NULL DEFAULT 0,
    used_credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE ai_credit_ledger 
DROP CONSTRAINT IF EXISTS check_positive_credits;

ALTER TABLE ai_credit_ledger 
ADD CONSTRAINT check_positive_credits CHECK (total_credits >= used_credits);

-- 4. Storage Bucket Provisions for Enterprise Migrations
INSERT INTO storage.buckets (id, name, public) 
VALUES ('enterprise-migrations', 'enterprise-migrations', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 5. Atomic Credit Deduction RPC
CREATE OR REPLACE FUNCTION public.deduct_ai_credits(p_workspace_id UUID, p_amount INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total INT;
    v_used INT;
BEGIN
    -- Atomic update: only update if there are enough remaining credits
    UPDATE ai_credit_ledger
    SET used_credits = used_credits + p_amount,
        updated_at = NOW()
    WHERE workspace_id = p_workspace_id
      AND (total_credits - used_credits) >= p_amount
    RETURNING total_credits, used_credits INTO v_total, v_used;

    IF FOUND THEN
        RETURN TRUE;
    ELSE
        -- If no row was updated, check if it's because the ledger doesn't exist yet
        IF NOT EXISTS (SELECT 1 FROM ai_credit_ledger WHERE workspace_id = p_workspace_id) THEN
            -- Insert default ledger with 1000 credits
            INSERT INTO ai_credit_ledger (workspace_id, total_credits, used_credits)
            VALUES (p_workspace_id, 1000, p_amount);
            RETURN TRUE;
        ELSE
            RETURN FALSE;
        END IF;
    END IF;
END;
$$;

-- 6. Per-tenant Dify API key for multi-tenant RAG calls
ALTER TABLE ai_agent_configs
ADD COLUMN IF NOT EXISTS dify_app_api_key TEXT;
