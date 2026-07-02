import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import { applyNodeWebSocketPolyfill } from '@/lib/supabase/node-websocket-polyfill';

applyNodeWebSocketPolyfill();

/**
 * Server‑side Supabase client using the Service Role key.
 * The Service Role key is stored in the environment variable `SUPABASE_SERVICE_ROLE_KEY`.
 * Uses the public Supabase URL from `NEXT_PUBLIC_SUPABASE_URL`.
 * This client is safe to use in Server Actions / API routes because it never reaches the browser.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function nodeSupabaseOptions(): SupabaseClientOptions<'public'> | undefined {
  // Browser / Edge — native WebSocket; do not inject Node transport.
  if (typeof window !== 'undefined') return undefined;

  try {
    // Node 20 worker/runtime — Realtime requires explicit `ws` transport (native WS is Node 22+).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ws = require('ws') as typeof import('ws');
    return { realtime: { transport: ws as never } };
  } catch {
    return undefined;
  }
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, nodeSupabaseOptions());

export default supabaseAdmin;
