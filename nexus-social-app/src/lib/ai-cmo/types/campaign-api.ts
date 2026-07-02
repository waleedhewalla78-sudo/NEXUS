/**
 * Feature 004 — Campaign API request/response contracts (Phase 1 async).
 */

import { z } from 'zod';

export const createCampaignRequestSchema = z.object({
  objective: z.string().trim().min(1, 'objective is required'),
  brandId: z.string().uuid().optional().nullable(),
  brandName: z.string().trim().optional(),
  locale: z.string().min(2).optional().default('en-US'),
  persona: z.enum(['executive', 'operator', 'compliance']).optional().default('operator'),
});

export type CreateCampaignRequest = z.infer<typeof createCampaignRequestSchema>;

export const createCampaignResponseSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['processing', 'queued', 'failed']),
  pollUrl: z.string().min(1),
});

export type CreateCampaignResponse = z.infer<typeof createCampaignResponseSchema>;

export const campaignJobPollResponseSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['queued', 'processing', 'running', 'completed', 'failed']),
  objective: z.string().optional(),
  campaignId: z.string().uuid().optional(),
  postId: z.string().uuid().optional(),
  result: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CampaignJobPollResponse = z.infer<typeof campaignJobPollResponseSchema>;
