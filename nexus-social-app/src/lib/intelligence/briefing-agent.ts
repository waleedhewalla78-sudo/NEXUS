/**
 * Sprint 7 — Executive Briefing Agent (LLM with safe fallback).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IngestRow } from '@/lib/intelligence/ingest-raw';

const FALLBACK_BRIEF = `## Executive summary

AI briefing is temporarily unavailable. Review the raw ingested metrics below and regenerate when the model endpoint is healthy.

### Strategic recommendation

Prioritize channels with stable conversion and pause spend on assets showing >20% week-over-week decline until creative is refreshed.`;

export async function generateExecutiveBriefText(input: {
  workspaceName: string;
  source: string;
  rows: IngestRow[];
  anomalies: Array<{ metric: string; message: string }>;
}): Promise<{ text: string; usedLlm: boolean }> {
  const sample = input.rows.slice(0, 40);
  const anomalyBlock =
    input.anomalies.length > 0
      ? input.anomalies.map((a) => `- ${a.message}`).join('\n')
      : '- No >20% spikes/drops detected in sample rows.';

  const prompt = `You are a CMO advising a MENA enterprise client (${input.workspaceName}).
Data source: ${input.source}
Anomalies:
${anomalyBlock}
Performance sample (JSON, max 40 rows):
${JSON.stringify(sample)}

Write a concise executive brief in Markdown with:
1) Three bullet executive summary
2) One strategic recommendation (1-2 sentences)
3) Optional top 3 metrics as a markdown table if numbers exist

No fluff. Board-ready tone.`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://nexussocial.tech',
          'X-Title': 'Nexus Intelligence Briefing',
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You write 1-page CMO executive briefs. Markdown only.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return { text, usedLlm: true };
      }
      console.warn(`[intelligence-brief] OpenRouter HTTP ${res.status}`);
    } catch (err) {
      console.warn(
        '[intelligence-brief] LLM failed:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  return { text: FALLBACK_BRIEF, usedLlm: false };
}

export async function runBriefingForWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<{ briefsCreated: number; ingestIds: string[] }> {
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .maybeSingle();

  const { data: pending, error } = await supabase
    .from('intelligence_ingests')
    .select('id, source, raw_data, anomalies')
    .eq('workspace_id', workspaceId)
    .eq('brief_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20);

  if (error) throw new Error(error.message);
  if (!pending?.length) return { briefsCreated: 0, ingestIds: [] };

  const ingestIds = pending.map((p) => p.id as string);
  const mergedRows: IngestRow[] = [];
  const anomalies: Array<{ metric: string; message: string }> = [];
  const sources = new Set<string>();

  for (const row of pending) {
    sources.add(String(row.source));
    const raw = row.raw_data;
    if (Array.isArray(raw)) {
      for (const r of raw) {
        if (r && typeof r === 'object') mergedRows.push(r as IngestRow);
      }
    }
    if (Array.isArray(row.anomalies)) {
      for (const a of row.anomalies) {
        if (a && typeof a === 'object' && 'message' in a) {
          anomalies.push(a as { metric: string; message: string });
        }
      }
    }
  }

  const brief = await generateExecutiveBriefText({
    workspaceName: workspace?.name ?? 'Client',
    source: [...sources].join(', '),
    rows: mergedRows,
    anomalies,
  });

  const { error: briefErr } = await supabase.from('intelligence_briefs').insert({
    workspace_id: workspaceId,
    ingest_ids: ingestIds,
    brief_text: brief.text,
    status: brief.usedLlm ? 'ready' : 'ready',
  });

  if (briefErr) throw new Error(briefErr.message);

  await supabase
    .from('intelligence_ingests')
    .update({ brief_status: 'generated' })
    .in('id', ingestIds)
    .eq('workspace_id', workspaceId);

  return { briefsCreated: 1, ingestIds };
}

export async function runBriefingForAllWorkspaces(
  supabase: SupabaseClient,
): Promise<{ workspaces: number; briefsCreated: number }> {
  const { data: pending } = await supabase
    .from('intelligence_ingests')
    .select('workspace_id')
    .eq('brief_status', 'pending')
    .limit(200);

  const workspaceIds = [...new Set((pending ?? []).map((p) => p.workspace_id as string))];
  let briefsCreated = 0;
  for (const workspaceId of workspaceIds) {
    const result = await runBriefingForWorkspace(supabase, workspaceId);
    briefsCreated += result.briefsCreated;
  }
  return { workspaces: workspaceIds.length, briefsCreated };
}
