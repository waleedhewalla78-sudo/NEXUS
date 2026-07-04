import { describe, expect, it, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { parseMetaLeadFieldData, verifyMetaLeadAdsSignature } from '@/lib/enterprise/meta-lead-ads';

describe('parseMetaLeadFieldData', () => {
  it('parses Meta Lead Gen field_data payload', () => {
    const lead = parseMetaLeadFieldData({
      field_data: [
        { name: 'full_name', values: ['Waleed Hewalla'] },
        { name: 'email', values: ['test@example.com'] },
        { name: 'phone_number', values: ['1234567890'] },
      ],
    });
    expect(lead).toEqual({
      firstName: 'Waleed',
      lastName: 'Hewalla',
      email: 'test@example.com',
      phone: '1234567890',
      fullName: 'Waleed Hewalla',
    });
  });

  it('returns null without email', () => {
    expect(
      parseMetaLeadFieldData({
        field_data: [{ name: 'full_name', values: ['No Email'] }],
      }),
    ).toBeNull();
  });
});

describe('verifyMetaLeadAdsSignature', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts valid X-Hub-Signature-256', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('META_WEBHOOK_SECRET', 'test-secret');
    const body = '{"field_data":[]}';
    const digest = crypto.createHmac('sha256', 'test-secret').update(body, 'utf8').digest('hex');
    const req = new Request('http://localhost/api', {
      method: 'POST',
      headers: { 'X-Hub-Signature-256': `sha256=${digest}` },
      body,
    });
    expect(verifyMetaLeadAdsSignature(req, body)).toBe(true);
  });

  it('rejects invalid signature when secret is set', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('META_WEBHOOK_SECRET', 'test-secret');
    const req = new Request('http://localhost/api', {
      method: 'POST',
      headers: { 'X-Hub-Signature-256': 'sha256=deadbeef' },
      body: '{}',
    });
    expect(verifyMetaLeadAdsSignature(req, '{}')).toBe(false);
  });
});
