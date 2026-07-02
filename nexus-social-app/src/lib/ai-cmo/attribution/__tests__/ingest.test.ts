import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ingestAttributionEvent, parseUtmParams } from '@/lib/ai-cmo/attribution/ingest';

vi.mock('@/lib/ai-cmo/utils/secure-reconciler-writer', () => ({
  secureSyncToSoR: vi.fn(),
}));

import { secureSyncToSoR } from '@/lib/ai-cmo/utils/secure-reconciler-writer';

const workspaceId = '550e8400-e29b-41d4-a716-446655440000';
const userId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('attribution ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists attribution event via reconciler', async () => {
    vi.mocked(secureSyncToSoR).mockResolvedValue({ ok: true, id: 'attr-1' });

    const result = await ingestAttributionEvent({
      workspaceId,
      userId,
      visitorId: 'visitor-abc',
      eventType: 'page_view',
      campaignId: 'camp-1',
      utmParams: { utm_source: 'linkedin' },
    });

    expect(result.ok).toBe(true);
    expect(secureSyncToSoR).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'ai_cmo_attribution_events',
        auditAction: 'ai_cmo.attribution.recorded',
      }),
    );
  });

  it('parses UTM params from URLSearchParams', () => {
    const params = new URLSearchParams('utm_source=linkedin&utm_campaign=q3');
    expect(parseUtmParams(params)).toEqual({
      utm_source: 'linkedin',
      utm_campaign: 'q3',
    });
  });
});
