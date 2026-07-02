import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { aggregateChannelRisk } from '@/lib/ai-cmo/channel-risk/aggregator';

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const summary = await aggregateChannelRisk(auth.workspaceId);
  return NextResponse.json(summary);
}
