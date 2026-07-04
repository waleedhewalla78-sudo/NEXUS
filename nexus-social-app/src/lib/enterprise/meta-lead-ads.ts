import crypto from 'crypto';

export type MetaLeadField = {
  name: string;
  values: string[];
};

export type ParsedMetaLead = {
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  fullName: string | null;
};

function fieldValue(fields: MetaLeadField[], name: string): string | null {
  const entry = fields.find((f) => f.name.toLowerCase() === name.toLowerCase());
  const value = entry?.values?.[0]?.trim();
  return value || null;
}

/**
 * Parse Meta Lead Ads `field_data` into enterprise_leads columns.
 */
export function parseMetaLeadFieldData(raw: unknown): ParsedMetaLead | null {
  if (!raw || typeof raw !== 'object') return null;

  const body = raw as { field_data?: unknown };
  if (!Array.isArray(body.field_data)) return null;

  const fields = body.field_data.filter(
    (f): f is MetaLeadField =>
      !!f &&
      typeof f === 'object' &&
      typeof (f as MetaLeadField).name === 'string' &&
      Array.isArray((f as MetaLeadField).values),
  );

  if (fields.length === 0) return null;

  const email = fieldValue(fields, 'email') ?? fieldValue(fields, 'work_email');
  if (!email || !email.includes('@')) return null;

  const fullName =
    fieldValue(fields, 'full_name') ??
    fieldValue(fields, 'full name') ??
    fieldValue(fields, 'name');
  const phone =
    fieldValue(fields, 'phone_number') ??
    fieldValue(fields, 'phone') ??
    fieldValue(fields, 'phone_number_');

  let firstName = fieldValue(fields, 'first_name') ?? fieldValue(fields, 'first name');
  let lastName = fieldValue(fields, 'last_name') ?? fieldValue(fields, 'last name');

  if (!firstName && fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    firstName = parts[0] ?? 'Lead';
    lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;
  }

  if (!firstName) {
    firstName = email.split('@')[0] || 'Lead';
  }

  return {
    firstName,
    lastName,
    email,
    phone,
    fullName,
  };
}

/**
 * Verify Meta `X-Hub-Signature-256` (HMAC-SHA256 of raw body).
 * Uses META_WEBHOOK_SECRET; falls back to META_APP_SECRET when unset.
 * Dev: allows missing secret. Production: requires secret + valid signature.
 */
export function verifyMetaLeadAdsSignature(req: Request, rawBody: string): boolean {
  const secret =
    process.env.META_WEBHOOK_SECRET ??
    process.env.META_APP_SECRET ??
    '';

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Meta Lead Ads] META_WEBHOOK_SECRET (or META_APP_SECRET) missing');
      return false;
    }
    console.warn('[Meta Lead Ads] webhook secret not set — skipping verification in dev');
    return true;
  }

  const signature =
    req.headers.get('x-hub-signature-256') ?? req.headers.get('X-Hub-Signature-256');

  if (!signature) {
    return false;
  }

  const normalized = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

  try {
    const a = Buffer.from(normalized, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return normalized === expected;
  }
}
