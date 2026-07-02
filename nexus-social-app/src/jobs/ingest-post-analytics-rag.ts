import { supabaseAdmin } from '@/lib/supabase/server';

const RAG_BATCH = Number(process.env.RAG_INGEST_BATCH_SIZE ?? 25);

function isRagIngestEnabled(): boolean {
  return (process.env.RAG_INGEST_ENABLED ?? 'true').toLowerCase() !== 'false';
}

function buildAnalyticsSummary({
  workspaceId,
  platform,
  impressions,
  engagement,
  syncedAt,
}: {
  workspaceId: string;
  platform: string;
  impressions: number;
  engagement: number;
  syncedAt: string;
}): string {
  return [
    `Workspace ${workspaceId}`,
    `Platform: ${platform}`,
    `Impressions: ${impressions}`,
    `Engagement: ${engagement}`,
    `Synced at: ${syncedAt}`,
  ].join('\n');
}

async function ingestToDifyDataset({
  datasetId,
  name,
  text,
}: {
  datasetId: string;
  name: string;
  text: string;
}): Promise<void> {
  const difyBase = process.env.DIFY_BASE_URL?.replace(/\/$/, '') ?? '';
  const difyAdminKey = process.env.DIFY_ADMIN_API_KEY ?? '';

  if (!difyBase || !difyAdminKey) {
    throw new Error('Dify admin configuration missing for RAG ingest');
  }

  const res = await fetch(`${difyBase}/v1/datasets/${datasetId}/document/create-by-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${difyAdminKey}`,
    },
    body: JSON.stringify({
      name,
      text,
      indexing_technique: 'high_quality',
      process_rule: { mode: 'automatic' },
    }),
  });

  if (!res.ok) {
    throw new Error(`Dify RAG ingest failed: ${await res.text()}`);
  }
}

export async function ingestPostAnalyticsRag(): Promise<{
  processed: number;
  ingested: number;
  skipped: number;
  errors: number;
}> {
  if (!isRagIngestEnabled()) {
    return { processed: 0, ingested: 0, skipped: 0, errors: 0 };
  }

  const { data: rows, error } = await supabaseAdmin
    .from('post_analytics')
    .select('workspace_id, platform, impressions, likes, comments, shares, synced_at')
    .not('synced_at', 'is', null)
    .order('synced_at', { ascending: false })
    .limit(RAG_BATCH);

  if (error) {
    throw new Error(`Failed to load post_analytics for RAG: ${error.message}`);
  }

  let ingested = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows ?? []) {
    try {
      const { data: config } = await supabaseAdmin
        .from('ai_agent_configs')
        .select('dify_dataset_id')
        .eq('workspace_id', row.workspace_id)
        .maybeSingle();

      if (!config?.dify_dataset_id) {
        skipped += 1;
        continue;
      }

      const impressions = Number(row.impressions ?? 0);
      const engagement =
        Number(row.likes ?? 0) + Number(row.comments ?? 0) + Number(row.shares ?? 0);
      const syncedAt = row.synced_at as string;

      await ingestToDifyDataset({
        datasetId: config.dify_dataset_id,
        name: `analytics-${row.workspace_id}-${row.platform}-${syncedAt.slice(0, 10)}`,
        text: buildAnalyticsSummary({
          workspaceId: row.workspace_id as string,
          platform: row.platform as string,
          impressions,
          engagement,
          syncedAt,
        }),
      });
      ingested += 1;
    } catch (err) {
      errors += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error('[RagIngest]', message);
    }
  }

  return { processed: rows?.length ?? 0, ingested, skipped, errors };
}

export const ingestPostAnalyticsRagJob = { ingestPostAnalyticsRag };
