import { supabaseAdmin } from '@/lib/supabase/server';

/** Resolve a real workspace member for API-key campaign workflows (reconciler auth). */
export async function resolveApiWorkflowUserId(
  workspaceId: string,
  headerUserId?: string | null,
): Promise<string> {
  const trimmed = headerUserId?.trim();
  if (trimmed && !trimmed.startsWith('api-')) {
    return trimmed;
  }

  const { data, error } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .in('role', ['owner', 'admin', 'member'])
    .limit(1)
    .maybeSingle();

  if (error || !data?.user_id) {
    throw new Error(
      'No workspace member for API workflow — run: npx tsx scripts/seed-walkthrough-data.ts',
    );
  }

  return String(data.user_id);
}
