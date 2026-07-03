/**
 * Agent control plane aggregation for operator dashboard.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { listMeshAgents } from '@/lib/ai-cmo/agents/registry';

export type AgentControlPlaneEntry = {
  id: string;
  displayName: string;
  tier: 'core' | 'operational' | 'governance';
  description: string;
  implementation: 'production' | 'mesh' | 'legacy';
  mtdCostUsd: number;
  lastAuditAction: string | null;
  lastAuditAt: string | null;
};

export type ControlPlaneSnapshot = {
  workspaceId: string;
  agents: AgentControlPlaneEntry[];
  totalMtdCostUsd: number;
  totalTokens: number;
  pendingApprovals: number;
  failedJobs: number;
  recentAudit: { action: string; createdAt: string }[];
};

const AGENT_META: Record<
  string,
  { displayName: string; tier: AgentControlPlaneEntry['tier']; description: string; implementation: AgentControlPlaneEntry['implementation'] }
> = {
  strategic_brain: {
    displayName: 'Strategic Brain',
    tier: 'core',
    description: 'Campaign planning and ABM context injection',
    implementation: 'legacy',
  },
  creator: {
    displayName: 'Creator',
    tier: 'core',
    description: 'Multilingual content generation',
    implementation: 'legacy',
  },
  optimizer: {
    displayName: 'Optimizer',
    tier: 'operational',
    description: 'Outcome variance and replan proposals',
    implementation: 'mesh',
  },
  radar: {
    displayName: 'Radar',
    tier: 'operational',
    description: 'External signal ingestion',
    implementation: 'mesh',
  },
  quant: {
    displayName: 'Quant',
    tier: 'operational',
    description: 'Analytics and CTR insights',
    implementation: 'mesh',
  },
  sentinel: {
    displayName: 'Sentinel',
    tier: 'governance',
    description: 'Anomaly detection',
    implementation: 'mesh',
  },
  finance: {
    displayName: 'Finance',
    tier: 'governance',
    description: 'ROI and budget reallocation',
    implementation: 'mesh',
  },
  compliance: {
    displayName: 'Compliance',
    tier: 'governance',
    description: 'MENA/EU jurisdiction advisor',
    implementation: 'mesh',
  },
};

/** Maps audit_log action prefixes to agent ids for last-audit display (FR-066). */
const AUDIT_ACTION_TO_AGENT: Array<{ prefix: string; agentId: string }> = [
  { prefix: 'abm.crm', agentId: 'finance' },
  { prefix: 'abm.attribution', agentId: 'quant' },
  { prefix: 'abm.', agentId: 'strategic_brain' },
  { prefix: 'policy.', agentId: 'compliance' },
  { prefix: 'compliance.', agentId: 'compliance' },
  { prefix: 'campaign.', agentId: 'creator' },
  { prefix: 'creator.', agentId: 'creator' },
  { prefix: 'optimizer.', agentId: 'optimizer' },
  { prefix: 'radar.', agentId: 'radar' },
  { prefix: 'finance.', agentId: 'finance' },
  { prefix: 'sentinel.', agentId: 'sentinel' },
  { prefix: 'brain.', agentId: 'strategic_brain' },
];

function resolveAgentFromAuditAction(action: string): string | null {
  const lower = action.toLowerCase();
  for (const { prefix, agentId } of AUDIT_ACTION_TO_AGENT) {
    if (lower.startsWith(prefix)) return agentId;
  }
  return null;
}

function buildLastAuditByAgent(
  auditRows: Array<{ action: string; created_at: string }>,
): Record<string, { action: string; createdAt: string }> {
  const map: Record<string, { action: string; createdAt: string }> = {};
  for (const row of auditRows) {
    const agentId = resolveAgentFromAuditAction(String(row.action));
    if (!agentId || map[agentId]) continue;
    map[agentId] = { action: String(row.action), createdAt: String(row.created_at) };
  }
  return map;
}

export async function queryControlPlaneSnapshot(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<ControlPlaneSnapshot> {
  const agentNames = listMeshAgents();

  const [{ data: costSummary }, { count: pendingApprovals }, { count: failedJobs }, { data: auditRows }] =
    await Promise.all([
      supabase.from('ai_cmo_cost_summary').select('*').eq('workspace_id', workspaceId).maybeSingle(),
      supabase
        .from('ai_cmo_approval_requests')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending'),
      supabase
        .from('ai_cmo_failed_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId),
      supabase
        .from('audit_logs')
        .select('action, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

  const lastAuditByAgent = buildLastAuditByAgent(auditRows ?? []);

  const breakdown = (costSummary?.agent_breakdown ?? {}) as Record<string, number>;
  const totalMtdCostUsd = Number(costSummary?.total_cost_usd ?? 0);
  const totalTokens = Number(costSummary?.total_tokens ?? 0);

  const agents: AgentControlPlaneEntry[] = agentNames.map((id) => {
    const meta = AGENT_META[id] ?? {
      displayName: id,
      tier: 'operational' as const,
      description: '',
      implementation: 'mesh' as const,
    };
    const costKey = id.replace(/_/g, '-');
    const mtdCostUsd =
      Number(breakdown[id] ?? breakdown[costKey] ?? breakdown[meta.displayName] ?? 0) || 0;
    return {
      id,
      ...meta,
      mtdCostUsd,
      lastAuditAction: lastAuditByAgent[id]?.action ?? null,
      lastAuditAt: lastAuditByAgent[id]?.createdAt ?? null,
    };
  });

  return {
    workspaceId,
    agents,
    totalMtdCostUsd,
    totalTokens,
    pendingApprovals: pendingApprovals ?? 0,
    failedJobs: failedJobs ?? 0,
    recentAudit: (auditRows ?? []).slice(0, 10).map((r) => ({
      action: String(r.action),
      createdAt: String(r.created_at),
    })),
  };
}
