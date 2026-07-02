import { supabaseAdmin } from '@/lib/supabase/server';

const LISTENING_BATCH = Number(process.env.SYNC_LISTENING_BATCH_SIZE ?? 20);

function isListeningSyncEnabled(): boolean {
  return (process.env.REPUTATION_SYNC_ENABLED ?? 'true').toLowerCase() !== 'false';
}

async function ingestQueryMentions(query: {
  id: string;
  workspace_id: string;
  query_text: string;
  query_type: string | null;
  platforms: string[] | null;
}): Promise<number> {
  const { count } = await supabaseAdmin
    .from('mentions')
    .select('id', { count: 'exact', head: true })
    .eq('query_id', query.id);

  if ((count ?? 0) > 0) {
    return 0;
  }

  const platform = query.platforms?.[0] ?? 'twitter';
  const sentiment = query.query_type === 'competitor_url' ? 'Neutral' : 'Positive';

  const { error } = await supabaseAdmin.from('mentions').insert({
    query_id: query.id,
    source_platform: platform,
    content: `Sample mention for "${query.query_text}" — configure live API keys for production ingestion.`,
    author_name: 'Ingestion Worker',
    author_url: query.query_type === 'competitor_url' ? query.query_text : null,
    sentiment,
    published_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to insert mention for query ${query.id}: ${error.message}`);
  }

  return 1;
}

export async function syncListening(): Promise<{ processed: number; ingested: number; errors: number }> {
  if (!isListeningSyncEnabled()) {
    return { processed: 0, ingested: 0, errors: 0 };
  }

  const { data: queries, error } = await supabaseAdmin
    .from('listening_queries')
    .select('id, workspace_id, query_text, query_type, platforms')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(LISTENING_BATCH);

  if (error) {
    throw new Error(`Failed to load listening queries: ${error.message}`);
  }

  let ingested = 0;
  let errors = 0;

  for (const query of queries ?? []) {
    try {
      ingested += await ingestQueryMentions(query);
    } catch (err) {
      errors += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error('[SyncListening]', message);
    }
  }

  return { processed: queries?.length ?? 0, ingested, errors };
}

export const syncListeningJob = { syncListening };
