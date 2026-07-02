import { describe, expect, it, vi, beforeEach } from 'vitest';
import { refreshAiCmoMaterializedViews } from '@/jobs/ai-cmo/refresh-mvs';

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/server';

describe('refreshAiCmoMaterializedViews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns refreshed views on success', async () => {
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
      success: true,
    });

    const result = await refreshAiCmoMaterializedViews();
    expect(result.refreshed).toBe(true);
    expect(result.views).toContain('ai_cmo_cost_summary');
  });

  it('gracefully handles missing RPC', async () => {
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
      data: null,
      error: {
        message: 'Could not find the function',
        code: 'PGRST202',
        details: '',
        hint: '',
        name: 'PostgrestError',
        toJSON: () => ({
          name: 'PostgrestError',
          message: 'Could not find the function',
          details: '',
          hint: '',
          code: 'PGRST202',
        }),
      },
      count: null,
      status: 404,
      statusText: 'Not Found',
      success: false,
    });

    const result = await refreshAiCmoMaterializedViews();
    expect(result.refreshed).toBe(false);
    expect(result.error).toBe('rpc_not_available');
  });
});
