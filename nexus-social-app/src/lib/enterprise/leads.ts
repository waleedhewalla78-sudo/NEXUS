export const ENTERPRISE_LEAD_SOURCES = [
  'website_form',
  'whatsapp',
  'meta_ads',
  'referral',
] as const;

export type EnterpriseLeadSource = (typeof ENTERPRISE_LEAD_SOURCES)[number];

export type InboundLeadPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  source?: string;
};

export type ValidatedInboundLead = {
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  source: EnterpriseLeadSource;
};

const DEFAULT_WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

type RateBucket = { count: number; resetAt: number };

const inboundRateBuckets = new Map<string, RateBucket>();

export function resolveEnterpriseLeadsWorkspaceId(): string {
  return process.env.ENTERPRISE_LEADS_WORKSPACE_ID ??
    process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ??
    DEFAULT_WORKSPACE_ID;
}

export function isEnterpriseLeadSource(value: string): value is EnterpriseLeadSource {
  return (ENTERPRISE_LEAD_SOURCES as readonly string[]).includes(value);
}

export function validateInboundLeadPayload(
  raw: unknown,
): { ok: true; data: ValidatedInboundLead } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const body = raw as InboundLeadPayload;
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (!firstName) {
    return { ok: false, error: 'firstName is required' };
  }
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'A valid email is required' };
  }

  const sourceRaw = typeof body.source === 'string' ? body.source.trim() : 'website_form';
  const source: EnterpriseLeadSource = isEnterpriseLeadSource(sourceRaw) ? sourceRaw : 'website_form';

  return {
    ok: true,
    data: {
      firstName,
      lastName: typeof body.lastName === 'string' ? body.lastName.trim() || null : null,
      email,
      phone: typeof body.phone === 'string' ? body.phone.trim() || null : null,
      company: typeof body.company === 'string' ? body.company.trim() || null : null,
      message: typeof body.message === 'string' ? body.message.trim() || null : null,
      source,
    },
  };
}

export function checkInboundLeadRateLimit(clientIp: string): boolean {
  const key = clientIp || 'unknown';
  const now = Date.now();
  const bucket = inboundRateBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    inboundRateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function resetInboundLeadRateLimitForTests(): void {
  inboundRateBuckets.clear();
}

export function extractClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return req.headers.get('x-real-ip')?.trim() ?? 'unknown';
}
