import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getRedisClient } from '@/lib/redis-client';

function extractApiKey(req: NextRequest): string | null {
  const headerKey = req.headers.get('x-api-key');
  if (headerKey) return headerKey.trim();

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  return null;
}

export type ApiAuthResult =
  | { ok: true; workspaceId: string; requestHeaders: Headers }
  | { ok: false; response: NextResponse };

export async function authenticateApiRequest(req: NextRequest): Promise<ApiAuthResult> {
  const token = extractApiKey(req);

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Missing or invalid API key' }, { status: 401 }),
    };
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { data: apiKey, error: dbError } = await supabaseAdmin
    .from('api_keys')
    .select('workspace_id, rate_limit_tier')
    .eq('key_hash', tokenHash)
    .single();

  if (dbError || !apiKey) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized API key' }, { status: 401 }),
    };
  }

  const rateKey = `rate_limit:${apiKey.workspace_id}`;
  const redis = getRedisClient();
  const current = await redis.incr(rateKey);
  if (current === 1) {
    await redis.expire(rateKey, 60);
  }

  if (current > (apiKey.rate_limit_tier ?? 60)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 }),
    };
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-workspace-id', apiKey.workspace_id);

  return { ok: true, workspaceId: apiKey.workspace_id, requestHeaders };
}

/** Next.js middleware adapter for `/api/v1/*` routes */
export async function apiAuthMiddleware(req: NextRequest) {
  const result = await authenticateApiRequest(req);
  if (!result.ok) {
    return result.response;
  }

  return NextResponse.next({
    request: { headers: result.requestHeaders },
  });
}
