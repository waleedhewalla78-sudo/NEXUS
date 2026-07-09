import { z } from 'zod';
import { uuidLikeSchema } from '@/lib/validation/uuid-like';
import { auditLog } from '@/lib/audit';
import { verifyWorkspaceMembership } from '@/lib/oauth/auth-guard';
import { supabaseAdmin } from '@/lib/supabase/server';

export const SorTableNames = {
  AI_CMO_CAMPAIGNS: 'ai_cmo_campaigns',
  AI_CMO_CONTENT_PIECES: 'ai_cmo_content_pieces',
  AI_CMO_LEARNINGS: 'ai_cmo_learnings',
  AI_CMO_CAMPAIGN_OUTCOMES: 'ai_cmo_campaign_outcomes',
  AI_CMO_STRATEGY_HISTORY: 'ai_cmo_strategy_history',
  AI_CMO_COST_LEDGER: 'ai_cmo_cost_ledger',
  AI_CMO_ATTRIBUTION_EVENTS: 'ai_cmo_attribution_events',
  AI_CMO_EVALUATIONS: 'ai_cmo_evaluations',
  AI_CMO_DECISION_LEDGER: 'ai_cmo_decision_ledger',
  AI_CMO_AGENT_DECISIONS: 'ai_cmo_agent_decisions',
  AI_CMO_EXPERIMENTS: 'ai_cmo_experiments',
  AI_CMO_APPROVAL_REQUESTS: 'ai_cmo_approval_requests',
  AI_CMO_EXTERNAL_SIGNALS: 'ai_cmo_external_signals',
  AI_CMO_FAILED_JOBS: 'ai_cmo_failed_jobs',
  ACCOUNT_INTENT_SCORES: 'account_intent_scores',
  ATTRIBUTION_REPORTS: 'attribution_reports',
  CRM_ACTIVITY_MIRROR: 'crm_activity_mirror',
  ABM_PLAYBOOK_RUNS: 'abm_playbook_runs',
  POSTS: 'posts',
  CONVERSATION_QUALIFICATIONS: 'conversation_qualifications',
  LEAD_SCORES: 'lead_scores',
  CONVERSATION_ESCALATIONS: 'conversation_escalations',
  QUALIFIED_LEADS: 'qualified_leads',
  WORKSPACE_CONVERSATION_SETTINGS: 'workspace_conversation_settings',
  COST_TO_SERVE_SNAPSHOTS: 'cost_to_serve_snapshots',
} as const;

export type SorTableName = (typeof SorTableNames)[keyof typeof SorTableNames];

const uuidSchema = uuidLikeSchema;
const workspaceScoped = { workspace_id: uuidSchema };

const sorWriteSchemas: Record<SorTableName, z.ZodType<Record<string, unknown>>> = {
  [SorTableNames.AI_CMO_CAMPAIGNS]: z
    .object({
      ...workspaceScoped,
      name: z.string().min(1),
      brand_id: uuidSchema.optional().nullable(),
      post_id: uuidSchema.optional().nullable(),
      objective: z.union([z.string(), z.record(z.string(), z.unknown())]).optional().nullable(),
      status: z
        .enum(['draft', 'planning', 'active', 'paused', 'completed', 'archived'])
        .optional(),
      calibrated_confidence: z.number().min(0).max(1).optional().nullable(),
    })
    .passthrough(),
  [SorTableNames.AI_CMO_CONTENT_PIECES]: z
    .object({
      ...workspaceScoped,
      content: z.record(z.string(), z.unknown()),
      campaign_id: uuidSchema.optional().nullable(),
      post_id: uuidSchema.optional().nullable(),
      locale: z.string().optional(),
    })
    .passthrough(),
  [SorTableNames.AI_CMO_LEARNINGS]: z
    .object({
      ...workspaceScoped,
      learning_type: z.enum(['content_pattern', 'timing', 'audience', 'channel', 'tone']),
      context: z.record(z.string(), z.unknown()).optional(),
      action: z.record(z.string(), z.unknown()).optional(),
      outcome: z.record(z.string(), z.unknown()).optional(),
      roi_impact: z.number().optional().nullable(),
      confidence: z.number().min(0).max(1).optional().nullable(),
    })
    .passthrough(),
  [SorTableNames.AI_CMO_CAMPAIGN_OUTCOMES]: z
    .object({
      ...workspaceScoped,
      campaign_id: uuidSchema,
      impressions: z.number().int().nonnegative().optional(),
      clicks: z.number().int().nonnegative().optional(),
      conversions: z.number().int().nonnegative().optional(),
      leads_generated: z.number().int().nonnegative().optional(),
      revenue_attributed: z.number().nonnegative().optional(),
      cost: z.number().nonnegative().optional(),
    })
    .passthrough(),
  [SorTableNames.AI_CMO_STRATEGY_HISTORY]: z
    .object({
      ...workspaceScoped,
      strategy_id: uuidSchema,
      change_type: z.string().min(1),
      previous_state: z.record(z.string(), z.unknown()).optional().nullable(),
      new_state: z.record(z.string(), z.unknown()).optional().nullable(),
      reason: z.string().optional().nullable(),
      triggered_by: z.string().optional().nullable(),
    })
    .passthrough(),
  [SorTableNames.AI_CMO_COST_LEDGER]: z
    .object({
      ...workspaceScoped,
      agent_name: z.string().min(1),
      cost_category: z.enum(['tokens', 'api_calls', 'storage', 'compute']),
      amount_usd: z.number().nonnegative(),
      campaign_id: uuidSchema.optional().nullable(),
      token_count: z.number().int().nonnegative().optional().nullable(),
      model_used: z.string().optional().nullable(),
    })
    .passthrough(),
  [SorTableNames.AI_CMO_ATTRIBUTION_EVENTS]: z
    .object({
      ...workspaceScoped,
      visitor_id: z.string().min(1),
      event_type: z.enum(['page_view', 'click', 'signup', 'demo_request', 'purchase']),
      campaign_id: uuidSchema.optional().nullable(),
      agent_name: z.string().optional().nullable(),
      channel: z.string().optional().nullable(),
      content_id: uuidSchema.optional().nullable(),
      utm_params: z.record(z.string(), z.unknown()).optional(),
      value: z.number().optional().nullable(),
      is_first_touch: z.boolean().optional(),
    })
    .passthrough(),
  [SorTableNames.AI_CMO_EVALUATIONS]: z
    .object({
      ...workspaceScoped,
      content_id: uuidSchema,
      evaluator_type: z.enum(['llm_as_judge', 'human', 'automated']),
      accuracy_score: z.number().min(0).max(1).optional().nullable(),
      localization_score: z.number().min(0).max(1).optional().nullable(),
      brand_alignment_score: z.number().min(0).max(1).optional().nullable(),
      hallucination_flag: z.boolean().optional(),
      overall_quality_score: z.number().min(0).max(1).optional().nullable(),
      calibrated_confidence: z.number().min(0).max(1).optional().nullable(),
      engagement_score: z.number().min(0).max(1).optional().nullable(),
      evaluator_model: z.string().optional().nullable(),
    })
    .passthrough(),
  [SorTableNames.AI_CMO_DECISION_LEDGER]: z
    .object({
      ...workspaceScoped,
      decision_id: uuidSchema,
      agent_name: z.string().min(1),
      decision_type: z.string().optional().nullable(),
      rationale: z.record(z.string(), z.unknown()).optional(),
      expected_kpis: z.record(z.string(), z.unknown()).optional(),
      actual_kpis: z.record(z.string(), z.unknown()).optional(),
      variance: z.record(z.string(), z.unknown()).optional(),
      human_override: z.boolean().optional(),
      lesson_learned: z.string().optional().nullable(),
    })
    .passthrough(),
  [SorTableNames.AI_CMO_AGENT_DECISIONS]: z
    .object({
      ...workspaceScoped,
      campaign_id: uuidSchema.optional().nullable(),
      agent_name: z.string().min(1),
      input_hash: z.string().min(1),
      input_summary: z.record(z.string(), z.unknown()).optional(),
      output: z.record(z.string(), z.unknown()),
      model_used: z.string().optional().nullable(),
      token_count: z.number().int().nonnegative().optional().nullable(),
      latency_ms: z.number().int().nonnegative().optional().nullable(),
    })
    .passthrough(),
  [SorTableNames.AI_CMO_EXPERIMENTS]: z
    .object({
      ...workspaceScoped,
      campaign_id: uuidSchema.optional().nullable(),
      experiment_key: z.string().min(1),
      variant: z.string().min(1),
      hypothesis: z.string().optional().nullable(),
      metrics: z.record(z.string(), z.unknown()).optional(),
      status: z.enum(['draft', 'running', 'concluded']).optional(),
    })
    .passthrough(),
  [SorTableNames.AI_CMO_APPROVAL_REQUESTS]: z
    .object({
      ...workspaceScoped,
      campaign_id: uuidSchema.optional().nullable(),
      content_id: uuidSchema.optional().nullable(),
      severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
      status: z.enum(['pending', 'approved', 'rejected', 'expired']).optional(),
      reason: z.string().min(1),
      payload: z.record(z.string(), z.unknown()).optional(),
      assignee_user_id: uuidSchema.optional().nullable(),
      sla_due_at: z.string().optional().nullable(),
      decided_at: z.string().optional().nullable(),
      decided_by: uuidSchema.optional().nullable(),
    })
    .passthrough(),
  [SorTableNames.AI_CMO_EXTERNAL_SIGNALS]: z
    .object({
      ...workspaceScoped,
      signal_id: z.string().min(1),
      source: z.string().min(1),
      headline: z.string().min(1),
      summary: z.string().optional().nullable(),
      relevance_score: z.number().min(0).max(1).optional().nullable(),
      recommended_action: z.string().optional().nullable(),
      topics: z.array(z.string()).optional(),
      raw_payload: z.record(z.string(), z.unknown()).optional(),
      detected_at: z.string().optional(),
    })
    .passthrough(),
  [SorTableNames.AI_CMO_FAILED_JOBS]: z
    .object({
      workspace_id: uuidSchema.optional().nullable(),
      job_id: z.string().optional().nullable(),
      inngest_run_id: z.string().optional().nullable(),
      function_id: z.string().min(1),
      failed_step: z.string().optional().nullable(),
      error_message: z.string().min(1),
      error_class: z.string().optional().nullable(),
      payload: z.record(z.string(), z.unknown()).optional(),
      langfuse_trace_id: z.string().optional().nullable(),
    })
    .passthrough(),
  [SorTableNames.ACCOUNT_INTENT_SCORES]: z
    .object({
      ...workspaceScoped,
      account_name: z.string().min(1),
      domain: z.string().min(1),
      industry: z.string().optional(),
      intent_score: z.number().int().min(1).max(100),
      buyer_stage: z.enum(['awareness', 'consideration', 'decision']),
      topics: z.array(z.string()).optional(),
      last_updated: z.string().optional(),
    })
    .passthrough(),
  [SorTableNames.ATTRIBUTION_REPORTS]: z
    .object({
      ...workspaceScoped,
      month: z.string().min(1),
      channel: z.string().min(1),
      touches: z.number().int().nonnegative(),
      attributed_revenue: z.number().nonnegative(),
      report_json: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough(),
  [SorTableNames.CRM_ACTIVITY_MIRROR]: z
    .object({
      ...workspaceScoped,
      crm_platform: z.enum(['hubspot', 'salesforce', 'generic']),
      account_id: z.string().min(1),
      account_domain: z.string().optional().nullable(),
      activity_type: z.string().min(1),
      deal_value: z.number().nonnegative().optional().nullable(),
      payload: z.record(z.string(), z.unknown()).optional(),
      occurred_at: z.string().optional(),
    })
    .passthrough(),
  [SorTableNames.ABM_PLAYBOOK_RUNS]: z
    .object({
      ...workspaceScoped,
      account_intent_id: uuidSchema,
      campaign_job_id: z.string().min(1),
      status: z.enum(['queued', 'processing', 'completed', 'failed']),
      objective_preview: z.string().optional(),
      triggered_by: z.string().min(1),
    })
    .passthrough(),
  [SorTableNames.POSTS]: z
    .object({
      ...workspaceScoped,
      content: z.record(z.string(), z.unknown()),
      platforms: z.array(z.string()).min(1),
      status: z.enum(['draft', 'scheduled', 'published', 'failed']).optional(),
      scheduled_at: z.string().optional(),
      brand_id: uuidSchema.optional().nullable(),
    })
    .passthrough(),
  [SorTableNames.CONVERSATION_QUALIFICATIONS]: z
    .object({
      ...workspaceScoped,
      conversation_id: z.string().min(1),
      channel: z.enum(['whatsapp', 'chatwoot', 'web', 'other']).optional(),
      locale: z.string().optional(),
      mode: z.enum(['shadow', 'ai_active', 'off']).optional(),
      status: z
        .enum(['drafting', 'pending_human', 'qualified', 'escalated', 'discarded'])
        .optional(),
      inbound_text: z.string().optional(),
      draft_reply: z.string().optional().nullable(),
      slots: z.record(z.string(), z.unknown()).optional(),
      confidence: z.number().min(0).max(1).optional().nullable(),
      lead_score_id: uuidSchema.optional().nullable(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough(),
  [SorTableNames.LEAD_SCORES]: z
    .object({
      ...workspaceScoped,
      qualification_id: uuidSchema.optional().nullable(),
      score: z.number().int().min(0).max(100),
      band: z.enum(['cold', 'warm', 'hot', 'qualified']),
      reasons: z.array(z.unknown()).optional(),
    })
    .passthrough(),
  [SorTableNames.CONVERSATION_ESCALATIONS]: z
    .object({
      ...workspaceScoped,
      qualification_id: uuidSchema,
      reason: z.string().min(1),
      sentiment: z.enum(['negative', 'neutral', 'positive', 'hostile']).optional().nullable(),
      context_payload: z.record(z.string(), z.unknown()).optional(),
      chatwoot_assignment_id: z.string().optional().nullable(),
      status: z.enum(['open', 'accepted', 'resolved', 'cancelled']).optional(),
    })
    .passthrough(),
  [SorTableNames.QUALIFIED_LEADS]: z
    .object({
      ...workspaceScoped,
      qualification_id: uuidSchema.optional().nullable(),
      lead_score_id: uuidSchema.optional().nullable(),
      contact_name: z.string().optional().nullable(),
      contact_email: z.string().optional().nullable(),
      contact_phone: z.string().optional().nullable(),
      company: z.string().optional().nullable(),
      slots: z.record(z.string(), z.unknown()).optional(),
      account_domain: z.string().optional().nullable(),
      crm_mirror_id: uuidSchema.optional().nullable(),
      status: z.enum(['new', 'synced', 'booked', 'lost']).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough(),
  [SorTableNames.WORKSPACE_CONVERSATION_SETTINGS]: z
    .object({
      ...workspaceScoped,
      mode: z.enum(['shadow', 'ai_active', 'off']).optional(),
      locale_default: z.string().optional(),
      compliance_profile: z.string().optional(),
    })
    .passthrough(),
  [SorTableNames.COST_TO_SERVE_SNAPSHOTS]: z
    .object({
      ...workspaceScoped,
      period_month: z.string().min(1),
      mrr_usd: z.number(),
      llm_api_usd: z.number().optional(),
      whatsapp_message_usd: z.number().optional(),
      bsp_fee_usd: z.number().optional(),
      pit_crew_labor_usd: z.number().optional(),
      infra_alloc_usd: z.number().optional(),
      total_cost_usd: z.number().optional(),
      gross_margin_usd: z.number().optional(),
      gross_margin_pct: z.number().optional(),
      passes_margin_gate: z.boolean().optional(),
      stop_scale: z.boolean().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough(),
};

export type ValidateWriteResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

export function validateWrite(table: SorTableName, data: Record<string, unknown>): ValidateWriteResult {
  const schema = sorWriteSchemas[table];
  if (!schema) {
    return { ok: false, error: `Unsupported SoR table: ${table}` };
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
  }

  return { ok: true, data: parsed.data };
}

export async function enforceRLS({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}): Promise<void> {
  await verifyWorkspaceMembership({ userId, workspaceId });
}

export type SyncToSoRInput = {
  table: SorTableName;
  data: Record<string, unknown>;
  workspaceId: string;
  userId: string;
  auditAction: string;
  auditMetadata?: Record<string, unknown>;
};

export type SyncToSoRResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function syncToSoR(input: SyncToSoRInput): Promise<SyncToSoRResult> {
  const validated = validateWrite(input.table, input.data);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  if (validated.data.workspace_id !== input.workspaceId) {
    return { ok: false, error: 'workspace_id mismatch' };
  }

  try {
    await enforceRLS({ workspaceId: input.workspaceId, userId: input.userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'RLS check failed';
    return { ok: false, error: message };
  }

  const { data: row, error } = await supabaseAdmin
    .from(input.table)
    .insert(validated.data)
    .select('id')
    .single();

  if (error || !row?.id) {
    return { ok: false, error: error?.message ?? 'Insert failed' };
  }

  await auditLog(input.workspaceId, input.userId, input.auditAction, {
    table: input.table,
    recordId: row.id,
    ...input.auditMetadata,
  });

  return { ok: true, id: row.id as string };
}

export type PatchSoRInput = {
  table: SorTableName;
  id: string;
  patch: Record<string, unknown>;
  workspaceId: string;
  userId: string;
  auditAction: string;
  auditMetadata?: Record<string, unknown>;
};

export async function patchSoR(input: PatchSoRInput): Promise<SyncToSoRResult> {
  try {
    await enforceRLS({ workspaceId: input.workspaceId, userId: input.userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'RLS check failed';
    return { ok: false, error: message };
  }

  const { data: row, error } = await supabaseAdmin
    .from(input.table)
    .update(input.patch)
    .eq('id', input.id)
    .eq('workspace_id', input.workspaceId)
    .select('id')
    .single();

  if (error || !row?.id) {
    return { ok: false, error: error?.message ?? 'Update failed' };
  }

  await auditLog(input.workspaceId, input.userId, input.auditAction, {
    table: input.table,
    recordId: row.id,
    ...input.auditMetadata,
  });

  return { ok: true, id: row.id as string };
}

export const reconcilerUtils = {
  validateWrite,
  enforceRLS,
  syncToSoR,
  patchSoR,
  SorTableNames,
};
