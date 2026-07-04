import { describe, expect, it, beforeEach } from 'vitest';
import {
  checkInboundLeadRateLimit,
  resetInboundLeadRateLimitForTests,
  validateInboundLeadPayload,
} from '@/lib/enterprise/leads';

describe('validateInboundLeadPayload', () => {
  it('accepts valid website form payload', () => {
    const result = validateInboundLeadPayload({
      firstName: 'Waleed',
      lastName: 'Hewalla',
      email: 'test@example.com',
      company: 'Nexus Corp',
      message: 'I want to see a demo',
      source: 'website_form',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.source).toBe('website_form');
    }
  });

  it('rejects missing email', () => {
    const result = validateInboundLeadPayload({ firstName: 'Waleed' });
    expect(result.ok).toBe(false);
  });

  it('rejects missing firstName', () => {
    const result = validateInboundLeadPayload({ email: 'test@example.com' });
    expect(result.ok).toBe(false);
  });

  it('defaults invalid source to website_form', () => {
    const result = validateInboundLeadPayload({
      firstName: 'A',
      email: 'a@b.com',
      source: 'unknown_channel',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.source).toBe('website_form');
  });
});

describe('checkInboundLeadRateLimit', () => {
  beforeEach(() => {
    resetInboundLeadRateLimitForTests();
  });

  it('allows up to 5 requests per IP per minute', () => {
    const ip = '203.0.113.10';
    for (let i = 0; i < 5; i += 1) {
      expect(checkInboundLeadRateLimit(ip)).toBe(true);
    }
    expect(checkInboundLeadRateLimit(ip)).toBe(false);
  });
});
