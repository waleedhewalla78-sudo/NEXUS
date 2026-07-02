'use server';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Task 4: Server Action to fetch AI analytics
 */
export async function getAiAnalytics(workspaceId: string) {
  // @ts-expect-error Next.js 15 async cookies conflict
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthorized');

  // Verify membership
  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', session.user.id)
    .single();

  if (!member) throw new Error('Forbidden');

  // Fetch aggregated analytics via RPC (Edge Case 3: Efficient date_trunc aggregation)
  const { data, error } = await supabase.rpc('get_ai_analytics', { p_workspace_id: workspaceId });

  if (error) {
    console.error('Failed to fetch analytics:', error);
    return [];
  }

  return data;
}
