export type AiVerifyResult = {
  ok: boolean;
  message: string;
};

export async function checkDifyVerifyStatus(): Promise<AiVerifyResult> {
  const base = (process.env.DIFY_BASE_URL ?? '').replace(/\/$/, '');
  const apiKey = process.env.DIFY_API_KEY ?? '';

  if (!base || !apiKey) {
    return {
      ok: false,
      message: 'Dify not configured. Set DIFY_BASE_URL and DIFY_API_KEY, then run npm run ai:verify.',
    };
  }

  try {
    const res = await fetch(`${base}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query: 'Reply with exactly: Nexus AI verify OK',
        response_mode: 'blocking',
        user: 'nexus-verify-preflight',
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      const txt = await res.text();
      if (txt.includes('not published')) {
        return {
          ok: false,
          message: 'Dify app is not published. Publish in Dify Studio, then run npm run ai:verify.',
        };
      }
      return { ok: false, message: `Dify verify failed (${res.status}). Run npm run ai:verify for details.` };
    }

    return { ok: true, message: 'Dify AI is ready.' };
  } catch {
    return { ok: false, message: 'Could not reach Dify. Check DIFY_BASE_URL and network, then npm run ai:verify.' };
  }
}
