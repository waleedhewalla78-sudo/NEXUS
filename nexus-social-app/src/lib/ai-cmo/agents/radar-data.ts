/**
 * L6 Radar — read-only 003 listening data (mentions + listening_queries).
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import type { ExternalSignal } from '@/lib/ai-cmo/agents/types/intelligence';

export async function fetchRecentMentionSignals(input: {
  workspaceId: string;
  limit?: number;
}): Promise<ExternalSignal[]> {
  const limit = input.limit ?? 25;

  const { data: queries, error: queryError } = await supabaseAdmin
    .from('listening_queries')
    .select('id, query_text')
    .eq('workspace_id', input.workspaceId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (queryError || !queries?.length) {
    return [];
  }

  const queryMap = new Map(queries.map((q) => [q.id, q.query_text]));
  const queryIds = queries.map((q) => q.id);

  const { data: mentions, error } = await supabaseAdmin
    .from('mentions')
    .select('id, source_platform, content, author_name, author_url, sentiment, published_at, query_id')
    .in('query_id', queryIds)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error || !mentions?.length) {
    return [];
  }

  return mentions.map((row) => {
    const queryLabel = row.query_id ? queryMap.get(row.query_id) : undefined;
    const headline =
      typeof row.content === 'string'
        ? row.content.slice(0, 160)
        : String(row.content ?? 'Mention detected').slice(0, 160);

    const sentiment = String(row.sentiment ?? 'Neutral').toLowerCase();

    return {
      source: `${row.source_platform ?? 'social'}${queryLabel ? `:${queryLabel}` : ''}`,
      headline,
      summary: row.author_name ? `Author: ${row.author_name}` : undefined,
      url: row.author_url ?? undefined,
      detectedAt: row.published_at ?? new Date().toISOString(),
      relevanceScore: sentiment === 'negative' ? 0.85 : sentiment === 'positive' ? 0.65 : 0.72,
    };
  });
}

export async function listActiveWorkspaceIds(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .limit(500);

  if (error || !data?.length) return [];
  return data.map((row) => row.id as string);
}

export type ExternalSignalRecord = {
  id: string;
  signalId: string;
  source: string;
  headline: string;
  summary: string | null;
  relevanceScore: number | null;
  recommendedAction: string | null;
  topics: string[];
  detectedAt: string;
};

export async function retrieveExternalSignals(workspaceId: string, limit = 10): Promise<ExternalSignalRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('ai_cmo_external_signals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  return data.map((row) => ({
    id: String(row.id),
    signalId: String(row.signal_id),
    source: String(row.source),
    headline: String(row.headline),
    summary: row.summary != null ? String(row.summary) : null,
    relevanceScore: row.relevance_score != null ? Number(row.relevance_score) : null,
    recommendedAction: row.recommended_action != null ? String(row.recommended_action) : null,
    topics: Array.isArray(row.topics) ? (row.topics as string[]) : [],
    detectedAt: String(row.detected_at),
  }));
}
