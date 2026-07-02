import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/health/route';

vi.mock('@/actions/health', () => ({
  checkSystemHealth: vi.fn(),
}));

import { checkSystemHealth } from '@/actions/health';

function mockHealth(
  overrides: Partial<Awaited<ReturnType<typeof checkSystemHealth>>>,
): Awaited<ReturnType<typeof checkSystemHealth>> {
  return {
    db: 'up',
    redis: 'up',
    worker: 'up',
    schema: 'up',
    chatwoot: 'unknown',
    dify: 'unknown',
    activepieces: 'unknown',
    overall: 'healthy',
    ...overrides,
  };
}

describe('Integration: GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with ok status when system is healthy', async () => {
    vi.mocked(checkSystemHealth).mockResolvedValue(mockHealth({}));

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.details.db).toBe('up');
    expect(json.timestamp).toBeTruthy();
  });

  it('returns 503 when overall health is down', async () => {
    vi.mocked(checkSystemHealth).mockResolvedValue(
      mockHealth({ overall: 'down', worker: 'unknown' }),
    );

    const res = await GET();
    expect(res.status).toBe(503);

    const json = await res.json();
    expect(json.status).toBe('error');
    expect(json.details.worker).toBe('unknown');
  });
});
