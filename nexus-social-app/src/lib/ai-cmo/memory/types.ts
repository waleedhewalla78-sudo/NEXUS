/**
 * Feature 004 Phase 2 — Memory layer interfaces (SoI read path).
 */

import { z } from 'zod';

export const memoryQueryParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  objective: z.string().optional(),
  k: z.number().int().positive().max(50).optional(),
  brandId: z.string().uuid().optional(),
});

export type MemoryQueryParams = z.infer<typeof memoryQueryParamsSchema>;

export type MemoryResultSource = 'postgres' | 'qdrant';

export type MemoryResult = {
  id: string;
  learningType: string;
  context: Record<string, unknown>;
  action: Record<string, unknown>;
  outcome: Record<string, unknown>;
  roiImpact: number | null;
  confidence: number | null;
  validatedByHuman: boolean;
  createdAt: string;
  source: MemoryResultSource;
  relevanceScore?: number;
};

export type LearningRecord = Omit<MemoryResult, 'source' | 'relevanceScore'> & {
  source?: MemoryResultSource;
};

export type OutcomeRecord = {
  id: string;
  campaignId: string;
  impressions: number;
  clicks: number;
  conversions: number;
  leadsGenerated: number;
  revenueAttributed: number;
  cost: number;
  roiRatio: number | null;
  lessonsLearned: Record<string, unknown> | null;
  measuredAt: string;
};

export type GetOutcomesInput = {
  workspaceId: string;
  campaignId?: string;
  limit?: number;
};

export interface IMemoryRepository {
  retrieve(input: MemoryQueryParams): Promise<MemoryResult[]>;
  getOutcomes(input: GetOutcomesInput): Promise<OutcomeRecord[]>;
}

/** @deprecated Use MemoryQueryParams */
export type RetrieveMemoryInput = MemoryQueryParams;
