import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// List of allowed origins for CORS. Update this list with your production domains.
const ALLOWED_ORIGINS = [
  'https://app.nexussocial.com',
  'https://nexussocial.local',
];

/**
 * Handles CORS for API routes.
 * Returns a response with appropriate CORS headers. For pre‑flight OPTIONS requests it returns a 204.
 */
export function handleCors(req: NextRequest): NextResponse {
  const origin = req.headers.get('origin') ?? '';
  const response = NextResponse.next();

  if (ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    response.headers.set('Access-Control-Allow-Origin', 'null');
  }

  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,DELETE,OPTIONS',
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Authorization,Content-Type,Accept',
  );
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  // Pre‑flight handling – respond with 204 No Content.
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  return response;
}
