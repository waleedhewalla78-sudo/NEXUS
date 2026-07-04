/**
 * Sprint 7 — Weekly + on-demand intelligence briefing (Inngest).
 * CL-030: does not touch campaign-workflow.ts.
 */

import { cron } from 'inngest';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getInngestClient } from '@/lib/orchestration/inngest-client';
import { runBriefingForAllWorkspaces, runBriefingForWorkspace } from '@/lib/intelligence/briefing-agent';

export const INTELLIGENCE_BRIEFING_EVENT = 'ai-cmo/intelligence.briefing.requested' as const;

export async function requestIntelligenceBriefing(workspaceId: string): Promise<void> {
  const client = getInngestClient();
  await client.send({
    name: INTELLIGENCE_BRIEFING_EVENT,
    data: {
      workspaceId,
      requestedAt: new Date().toISOString(),
    },
  });
}

export function getIntelligenceBriefingInngestFunctions(): unknown[] {
  const inngest = getInngestClient();

  const weekly = inngest.createFunction(
    {
      id: 'intelligence-briefing-weekly',
      name: 'Intelligence Briefing (Monday 09:00 UTC)',
      triggers: [cron('0 9 * * 1')],
    },
    async () => runBriefingForAllWorkspaces(supabaseAdmin),
  );

  const onDemand = inngest.createFunction(
    {
      id: 'intelligence-briefing-on-demand',
      name: 'Intelligence Briefing (On Demand)',
      triggers: [{ event: INTELLIGENCE_BRIEFING_EVENT }],
    },
    async ({ event }) => {
      const workspaceId = (event.data as { workspaceId?: string }).workspaceId;
      if (!workspaceId) throw new Error('workspaceId required');
      return runBriefingForWorkspace(supabaseAdmin, workspaceId);
    },
  );

  return [weekly, onDemand];
}
