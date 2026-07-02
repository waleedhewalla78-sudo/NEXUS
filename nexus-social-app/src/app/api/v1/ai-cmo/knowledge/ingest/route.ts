import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import {
  ingestKnowledgeSource,
  type KnowledgeSourceType,
} from '@/lib/ai-cmo/knowledge/knowledge-registry';

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  let body: { sourceType?: KnowledgeSourceType; sourceRef?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.sourceType !== 'web_url' || !body.sourceRef?.trim()) {
    return NextResponse.json(
      { error: 'sourceType must be web_url and sourceRef is required' },
      { status: 400 },
    );
  }

  try {
    const result = await ingestKnowledgeSource({
      workspaceId: auth.workspaceId,
      sourceType: body.sourceType,
      sourceRef: body.sourceRef.trim(),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingest failed';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
