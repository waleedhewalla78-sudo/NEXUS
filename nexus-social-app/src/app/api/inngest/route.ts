/**
 * Feature 004 — Inngest App Router serve endpoint (L3 orchestration).
 * Isolated from 003 publish/analytics Redis workers.
 */

import { serve } from 'inngest/next';
import type { InngestFunction } from 'inngest';
import { getInngestClient } from '@/lib/orchestration/inngest-client';
import { getAllAiCmoInngestFunctions } from '@/lib/orchestration/inngest-functions';

const handlers = serve({
  client: getInngestClient(),
  functions: getAllAiCmoInngestFunctions() as InngestFunction.Any[],
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
