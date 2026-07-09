// src/lib/chatwoot/client.ts
/**
 * Server-side Chatwoot API client.
 * Falls back to demo mode when CHATWOOT_* env vars are missing or unreachable.
 */

export function getConfig() {
  const BASE_URL = process.env.CHATWOOT_BASE_URL?.replace(/\/*$/, '') ?? '';
  const API_TOKEN = process.env.CHATWOOT_API_TOKEN ?? '';
  const ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID ?? '';

  return { BASE_URL, API_TOKEN, ACCOUNT_ID, isConfigured: Boolean(BASE_URL && API_TOKEN && ACCOUNT_ID) };
}

export function getHeaders(token: string) {
  return {
    api_access_token: token,
    'Content-Type': 'application/json',
  } as Record<string, string>;
}

export async function getConversations() {
  const { BASE_URL, API_TOKEN, ACCOUNT_ID, isConfigured } = getConfig();

  if (!isConfigured) {
    return { data: { payload: [] }, demoMode: true };
  }

  const url = `${BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations`;

  try {
    const res = await fetch(url, { method: 'GET', headers: getHeaders(API_TOKEN) });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Chatwoot getConversations failed: ${res.status} ${txt}`);
    }
    return res.json();
  } catch (err) {
    console.warn('[Chatwoot] Unreachable — using demo inbox mode:', (err as Error).message);
    return { data: { payload: [] }, demoMode: true };
  }
}

export async function getMessages(conversationId: string | number) {
  const { BASE_URL, API_TOKEN, ACCOUNT_ID, isConfigured } = getConfig();

  if (!isConfigured || String(conversationId).startsWith('demo-')) {
    return { payload: [] };
  }

  const url = `${BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/messages`;
  const res = await fetch(url, { method: 'GET', headers: getHeaders(API_TOKEN) });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Chatwoot getMessages failed: ${res.status} ${txt}`);
  }
  return res.json();
}

export async function sendMessage(
  conversationId: string | number,
  content: string,
  options?: { private?: boolean },
) {
  const { BASE_URL, API_TOKEN, ACCOUNT_ID, isConfigured } = getConfig();

  if (!isConfigured || String(conversationId).startsWith('demo-')) {
    return { content, demoMode: true, private: Boolean(options?.private) };
  }

  const url = `${BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/messages`;
  const body = JSON.stringify({
    content,
    ...(options?.private ? { private: true } : {}),
  });
  const res = await fetch(url, { method: 'POST', headers: getHeaders(API_TOKEN), body });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Chatwoot sendMessage failed: ${res.status} ${txt}`);
  }
  return res.json();
}
