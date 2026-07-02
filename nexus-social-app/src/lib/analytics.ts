// src/lib/analytics.ts
import { supabaseAdmin } from '@/lib/supabase/server';
import { useWorkspaceStore } from '@/store/workspace';

/**
 * Helper to get the current workspace ID from Zustand store (server‑side safe).
 */
function getWorkspaceId() {
  const wsId = useWorkspaceStore.getState().workspaceId;
  if (!wsId) throw new Error('Workspace ID not set');
  return wsId;
}

/** Fetch total posts per day for the last 30 days */
export async function fetchPostsPerDay() {
  const workspaceId = getWorkspaceId();
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('created_at')
    .eq('workspace_id', workspaceId);
  if (error) throw error;
  // Aggregate counts by date (YYYY‑MM‑DD)
  const counts: Record<string, number> = {};
  data?.forEach((row) => {
    const date = new Date(row.created_at).toISOString().split('T')[0];
    counts[date] = (counts[date] || 0) + 1;
  });
  // Convert to an array sorted by date
  return Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Fetch active users per day (based on auth.audit_logs) */
export async function fetchActiveUsersPerDay() {
  const workspaceId = getWorkspaceId();
  const { data, error } = await supabaseAdmin
    .from('auth.audit_logs')
    .select('created_at')
    .eq('workspace_id', workspaceId);
  if (error) throw error;
  const counts: Record<string, Set<string>> = {};
  data?.forEach((row) => {
    const date = new Date(row.created_at).toISOString().split('T')[0];
    if (!counts[date]) counts[date] = new Set();
    // Assuming row.user_id exists
    // @ts-ignore
    counts[date].add(row.user_id);
  });
  return Object.entries(counts)
    .map(([date, set]) => ({ date, count: set.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Fetch AI usage count per day */
export async function fetchAIUsagePerDay() {
  const workspaceId = getWorkspaceId();
  const { data, error } = await supabaseAdmin
    .from('ai_events')
    .select('created_at')
    .eq('workspace_id', workspaceId);
  if (error) throw error;
  const counts: Record<string, number> = {};
  data?.forEach((row) => {
    const date = new Date(row.created_at).toISOString().split('T')[0];
    counts[date] = (counts[date] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
