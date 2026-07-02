import { describe, expect, it } from 'vitest';
import {
  scrubPiiFromText,
  scrubPiiFromValue,
} from '@/lib/observability/langfuse-client';

describe('langfuse PII scrubber', () => {
  it('redacts email addresses', () => {
    const input = 'Contact us at support@example.com for help';
    expect(scrubPiiFromText(input)).toBe('Contact us at [REDACTED_PII] for help');
  });

  it('redacts phone numbers', () => {
    const input = 'Call +971 50 123 4567 today';
    expect(scrubPiiFromText(input)).toContain('[REDACTED_PII]');
  });

  it('scrubs nested objects', () => {
    const result = scrubPiiFromValue({
      caption: 'Email me at user@test.com',
      meta: { phone: '+1-555-0100' },
    }) as Record<string, unknown>;

    expect(result.caption).toBe('Email me at [REDACTED_PII]');
    expect((result.meta as Record<string, string>).phone).toContain('[REDACTED_PII]');
  });
});
