import crypto from 'crypto';

function getApprovalSecret(): string {
  return process.env.APPROVAL_HMAC_SECRET || process.env.JWT_SECRET || '';
}

export function signApprovalPayload({
  workspaceId,
  conversationId,
  timestamp,
}: {
  workspaceId: string;
  conversationId: string;
  timestamp: string;
}): string {
  const secret = getApprovalSecret();
  if (!secret) {
    throw new Error('Approval HMAC secret is not configured');
  }
  return crypto
    .createHmac('sha256', secret)
    .update(`${workspaceId}:${conversationId}:${timestamp}`)
    .digest('hex');
}

export function createApprovalTokenUrls({
  workspaceId,
  conversationId,
  baseUrl,
}: {
  workspaceId: string;
  conversationId: string;
  baseUrl?: string;
}): { approveUrl: string; rejectUrl: string } {
  const timestamp = String(Date.now());
  const token = Buffer.from(`${workspaceId}:${conversationId}:${timestamp}`).toString('base64');
  const sig = signApprovalPayload({ workspaceId, conversationId, timestamp });
  const base = (baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005').replace(/\/$/, '');
  const encodedToken = encodeURIComponent(token);
  return {
    approveUrl: `${base}/api/tools/approve-refund?token=${encodedToken}&sig=${sig}&action=approve`,
    rejectUrl: `${base}/api/tools/approve-refund?token=${encodedToken}&sig=${sig}&action=reject`,
  };
}

export function verifyApprovalToken({
  token,
  sig,
}: {
  token: string;
  sig: string;
}): {
  valid: boolean;
  workspaceId?: string;
  conversationId?: string;
  error?: string;
} {
  if (!getApprovalSecret()) {
    return { valid: false, error: 'Server configuration error' };
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [workspaceId, conversationId, timestamp] = decoded.split(':');

    if (!workspaceId || !conversationId || !timestamp) {
      return { valid: false, error: 'Invalid token payload' };
    }

    const expectedSig = signApprovalPayload({ workspaceId, conversationId, timestamp });

    if (sig.length !== expectedSig.length) {
      return { valid: false, error: 'Invalid signature' };
    }

    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return { valid: false, error: 'Invalid signature' };
    }

    if (Date.now() - parseInt(timestamp, 10) > 24 * 60 * 60 * 1000) {
      return { valid: false, error: 'Approval link expired' };
    }

    return { valid: true, workspaceId, conversationId };
  } catch {
    return { valid: false, error: 'Invalid token' };
  }
}
