import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { runCopilotChat } from '@/lib/ai/copilot/copilot-service';

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  let body: {
    message?: string;
    locale?: string;
    brandName?: string;
    conversationHistory?: string[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const userId = auth.requestHeaders.get('x-user-id') ?? `api-${auth.workspaceId}`;

  const result = await runCopilotChat({
    workspaceId: auth.workspaceId,
    userId,
    message: body.message.trim(),
    locale: body.locale,
    brandName: body.brandName,
    conversationHistory: body.conversationHistory,
  });

  return NextResponse.json(result);
}
