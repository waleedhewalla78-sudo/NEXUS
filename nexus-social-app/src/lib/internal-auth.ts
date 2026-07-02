import { NextResponse } from 'next/server';

/**
 * Validates internal service-to-service calls using INTERNAL_TOOL_SECRET.
 */
export function verifyInternalBearer(req: Request): boolean {
  const secret = process.env.INTERNAL_TOOL_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  return token === secret;
}

export function unauthorizedInternalResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
