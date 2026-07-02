/**
 * Feature 004 Phase 2 — Hybrid MemoryRepository (Postgres + Qdrant + external signals).
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { searchQdrantLearnings } from '@/lib/ai-cmo/memory/qdrant-client';
import { retrieveExternalSignals } from '@/lib/ai-cmo/agents/radar-data';
import type {
  GetOutcomesInput,
  IMemoryRepository,
  MemoryQueryParams,
  MemoryResult,
  OutcomeRecord,
} from '@/lib/ai-cmo/memory/types';

const CONFIDENCE_THRESHOLD = 0.8;
const DEFAULT_LIMIT = 10;

function mapPostgresRow(row: Record<string, unknown>): MemoryResult {
  return {
    id: String(row.id),
    learningType: String(row.learning_type),
    context: (row.context as Record<string, unknown>) ?? {},
    action: (row.action as Record<string, unknown>) ?? {},
    outcome: (row.outcome as Record<string, unknown>) ?? {},
    roiImpact: row.roi_impact != null ? Number(row.roi_impact) : null,
    confidence: row.confidence != null ? Number(row.confidence) : null,
    validatedByHuman: Boolean(row.validated_by_human),
    createdAt: String(row.created_at),
    source: 'postgres',
  };
}

function mapExternalSignalToMemory(signal: Awaited<ReturnType<typeof retrieveExternalSignals>>[number]): MemoryResult {
  return {
    id: signal.id,
    learningType: 'external_signal',
    context: {
      headline: signal.headline,
      summary: signal.summary,
      source: signal.source,
      recommendedAction: signal.recommendedAction,
      topics: signal.topics,
    },
    action: {},
    outcome: {},
    roiImpact: null,
    confidence: signal.relevanceScore,
    validatedByHuman: false,
    createdAt: signal.detectedAt,
    source: 'postgres',
    relevanceScore: signal.relevanceScore ?? undefined,
  };
}

function mapOutcome(row: Record<string, unknown>): OutcomeRecord {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    conversions: Number(row.conversions ?? 0),
    leadsGenerated: Number(row.leads_generated ?? 0),
    revenueAttributed: Number(row.revenue_attributed ?? 0),
    cost: Number(row.cost ?? 0),
    roiRatio: row.roi_ratio != null ? Number(row.roi_ratio) : null,
    lessonsLearned: (row.lessons_learned as Record<string, unknown>) ?? null,
    measuredAt: String(row.measured_at),
  };
}

async function retrieveFromPostgres(input: MemoryQueryParams): Promise<MemoryResult[]> {
  const limit = input.k ?? DEFAULT_LIMIT;

  const { data, error } = await supabaseAdmin
    .from('ai_cmo_learnings')
    .select('*')
    .eq('workspace_id', input.workspaceId)
    .or(`validated_by_human.eq.true,confidence.gte.${CONFIDENCE_THRESHOLD}`)
    .order('roi_impact', { ascending: false, nullsFirst: false })
    .limit(limit * 2);

  if (error || !data?.length) {
    return [];
  }

  return data.map((row) => mapPostgresRow(row as Record<string, unknown>));
}

function rankByObjective(results: MemoryResult[], objective?: string): MemoryResult[] {
  if (!objective?.trim()) {
    return results.sort((a, b) => (b.roiImpact ?? 0) - (a.roiImpact ?? 0));
  }

  const tokens = objective.toLowerCase().split(/\W+/).filter((t) => t.length > 2);

  return results
    .map((item) => {
      const text = JSON.stringify(item.context).toLowerCase();
      const overlap = tokens.filter((t) => text.includes(t)).length;
      const score =
        overlap +
        (item.relevanceScore ?? 0) +
        (item.confidence ?? 0) +
        (item.roiImpact ?? 0) * 0.1;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

export function dedupeMemoryResults(results: MemoryResult[]): MemoryResult[] {
  const seen = new Map<string, MemoryResult>();

  for (const item of results) {
    const existing = seen.get(item.id);
    if (!existing) {
      seen.set(item.id, item);
      continue;
    }

    const mergedScore = (existing.relevanceScore ?? 0) + (item.relevanceScore ?? 0);
    seen.set(item.id, {
      ...existing,
      relevanceScore: mergedScore,
      confidence: Math.max(existing.confidence ?? 0, item.confidence ?? 0),
    });
  }

  return [...seen.values()];
}

export class MemoryRepository implements IMemoryRepository {
  async retrieveExternalSignals(workspaceId: string, limit = 10): Promise<MemoryResult[]> {
    const signals = await retrieveExternalSignals(workspaceId, limit);
    return signals.map(mapExternalSignalToMemory);
  }

  async retrieve(input: MemoryQueryParams): Promise<MemoryResult[]> {
    const limit = input.k ?? DEFAULT_LIMIT;

    const [postgresResults, qdrantResults, externalSignals] = await Promise.all([
      retrieveFromPostgres(input),
      searchQdrantLearnings(input),
      this.retrieveExternalSignals(input.workspaceId, 5),
    ]);

    const merged = dedupeMemoryResults([
      ...externalSignals,
      ...postgresResults,
      ...qdrantResults,
    ]);
    return rankByObjective(merged, input.objective).slice(0, limit);
  }

  async getOutcomes(input: GetOutcomesInput): Promise<OutcomeRecord[]> {
    let query = supabaseAdmin
      .from('ai_cmo_campaign_outcomes')
      .select('*')
      .eq('workspace_id', input.workspaceId)
      .order('measured_at', { ascending: false })
      .limit(input.limit ?? 20);

    if (input.campaignId) {
      query = query.eq('campaign_id', input.campaignId);
    }

    const { data, error } = await query;
    if (error || !data?.length) {
      return [];
    }

    return data.map((row) => mapOutcome(row as Record<string, unknown>));
  }
}

export const memoryRepository = new MemoryRepository();

export const memoryRepositoryUtils = {
  MemoryRepository,
  memoryRepository,
  retrieveFromPostgres,
  dedupeMemoryResults,
  rankByObjective,
};
