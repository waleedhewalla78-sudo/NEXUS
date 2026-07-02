/**
 * Node 20 worker/runtime — Supabase Realtime expects WebSocket (native in Node 22+).
 * No-op in browser and Edge runtimes.
 */
export function applyNodeWebSocketPolyfill(): void {
  if (typeof window !== 'undefined') return;
  if (typeof globalThis.WebSocket !== 'undefined') return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ws = require('ws') as typeof import('ws');
    (globalThis as typeof globalThis & { WebSocket: typeof WebSocket }).WebSocket =
      ws as unknown as typeof WebSocket;
  } catch {
    // `ws` must be installed for Node 20 workers (see package.json).
  }
}
