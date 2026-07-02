'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createActionClient } from '@/lib/supabase/action';
import { getAnalytics, type AnalyticsResult } from '@/actions/getAnalytics';

export interface ReportLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
}

const DEFAULT_LAYOUT: ReportLayoutItem[] = [
  { i: 'engagement', x: 0, y: 0, w: 6, h: 4, title: 'Engagement Over Time' },
  { i: 'platforms', x: 6, y: 0, w: 6, h: 4, title: 'Top Platforms' },
  { i: 'summary', x: 0, y: 4, w: 12, h: 4, title: 'Post Summary' },
];

export async function getReportData(workspaceId: string): Promise<{
  layout: ReportLayoutItem[];
  analytics: AnalyticsResult;
}> {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const analytics = await getAnalytics({ workspaceId, userId: user.id });

  const { data: report } = await supabaseAdmin
    .from('custom_reports')
    .select('layout')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const layout = Array.isArray(report?.layout)
    ? (report.layout as ReportLayoutItem[])
    : DEFAULT_LAYOUT;

  return { layout, analytics };
}

export async function saveReportLayout(workspaceId: string, layout: ReportLayoutItem[]) {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member) throw new Error('Unauthorized');

  const { data: existing } = await supabaseAdmin
    .from('custom_reports')
    .select('id')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    workspace_id: workspaceId,
    name: 'Default Report',
    layout,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from('custom_reports')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin.from('custom_reports').insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/reports/builder');
}
