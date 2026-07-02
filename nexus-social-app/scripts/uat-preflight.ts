/**
 * UAT preflight — clear demo workspace corpus so uniqueness guard
 * does not false-fail on accumulated prior UAT runs.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

function qdrantCollectionName(workspaceId: string, suffix: string): string {
  return `ws_${workspaceId.replace(/-/g, '_')}_${suffix}`;
}

export async function clearUatQdrantCorpus(workspaceId: string): Promise<{ cleared: string[] }> {
  const base = (process.env.QDRANT_URL ?? 'http://localhost:6333').replace(/\/$/, '');
  const cleared: string[] = [];

  for (const suffix of ['content', 'learnings']) {
    const collection = qdrantCollectionName(workspaceId, suffix);
    try {
      const res = await fetch(`${base}/collections/${collection}`, { method: 'DELETE' });
      if (res.ok || res.status === 404) {
        cleared.push(collection);
      }
    } catch {
      /* Qdrant optional for UAT */
    }
  }

  return { cleared };
}

export async function clearUatContentCorpus(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<{ deleted: number }> {
  const { count } = await supabase
    .from('ai_cmo_content_pieces')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  if (!count) {
    return { deleted: 0 };
  }

  const { error } = await supabase
    .from('ai_cmo_content_pieces')
    .delete()
    .eq('workspace_id', workspaceId);

  if (error) {
    throw new Error(`UAT preflight: failed to clear content corpus — ${error.message}`);
  }

  return { deleted: count };
}

export async function runUatPreflight(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<{ contentDeleted: number; qdrantCleared: string[] }> {
  const { deleted } = await clearUatContentCorpus(supabase, workspaceId);
  const { cleared } = await clearUatQdrantCorpus(workspaceId);
  return { contentDeleted: deleted, qdrantCleared: cleared };
}
