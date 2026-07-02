/**
 * Async campaign job store — Redis-backed status for 202 + poll pattern (Phase B).
 */

import type Redis from 'ioredis';
import { randomUUID } from 'node:crypto';

export const CAMPAIGN_QUEUE_KEY = 'queue:ai-cmo-campaigns';
export const CAMPAIGN_JOB_PREFIX = 'ai-cmo:job:';
export const CAMPAIGN_REPLAN_QUEUE_KEY = 'queue:ai-cmo-replan';

export type CampaignJobStatus = 'queued' | 'processing' | 'running' | 'completed' | 'failed';

export type CampaignJobRecord = {
  jobId: string;
  workspaceId: string;
  userId: string;
  status: CampaignJobStatus;
  objective?: string;
  campaignId?: string;
  result?: Record<string, unknown>;
  error?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
};

export type EnqueueCampaignJobInput = {
  redis: Redis;
  workspaceId: string;
  userId: string;
  objective: string;
  brandId?: string;
  brandName?: string;
  locale?: string;
  persona?: 'executive' | 'operator' | 'compliance';
  workspaceDifyApiKey?: string | null;
  campaignId?: string;
};

export type EnqueueReplanJobInput = {
  redis: Redis;
  workspaceId: string;
  campaignId?: string;
  reason: string;
  userId?: string;
};

function jobKey(jobId: string): string {
  return `${CAMPAIGN_JOB_PREFIX}${jobId}`;
}

export async function saveCampaignJob(redis: Redis, record: CampaignJobRecord): Promise<void> {
  await redis.set(jobKey(record.jobId), JSON.stringify(record), 'EX', 86400);
}

export async function getCampaignJob(redis: Redis, jobId: string): Promise<CampaignJobRecord | null> {
  const raw = await redis.get(jobKey(jobId));
  if (!raw) return null;
  return JSON.parse(raw) as CampaignJobRecord;
}

export async function updateCampaignJob(
  redis: Redis,
  jobId: string,
  patch: Partial<CampaignJobRecord>,
): Promise<CampaignJobRecord | null> {
  const existing = await getCampaignJob(redis, jobId);
  if (!existing) return null;

  const updated: CampaignJobRecord = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await saveCampaignJob(redis, updated);
  return updated;
}

export async function createProcessingCampaignJob(input: {
  redis: Redis;
  workspaceId: string;
  userId: string;
  objective: string;
  brandId?: string;
}): Promise<CampaignJobRecord> {
  const jobId = randomUUID();
  const now = new Date().toISOString();

  const record: CampaignJobRecord = {
    jobId,
    workspaceId: input.workspaceId,
    userId: input.userId,
    status: 'processing',
    objective: input.objective,
    createdAt: now,
    updatedAt: now,
  };

  await saveCampaignJob(input.redis, record);
  return record;
}

export async function enqueueCampaignJob(input: EnqueueCampaignJobInput): Promise<CampaignJobRecord> {
  const jobId = randomUUID();
  const now = new Date().toISOString();

  const record: CampaignJobRecord = {
    jobId,
    workspaceId: input.workspaceId,
    userId: input.userId,
    status: 'queued',
    objective: input.objective,
    campaignId: input.campaignId,
    createdAt: now,
    updatedAt: now,
  };

  await saveCampaignJob(input.redis, record);
  await input.redis.lpush(
    CAMPAIGN_QUEUE_KEY,
    JSON.stringify({
      jobId,
      workspaceId: input.workspaceId,
      userId: input.userId,
      objective: input.objective,
      brandId: input.brandId,
      brandName: input.brandName,
      locale: input.locale,
      persona: input.persona,
      workspaceDifyApiKey: input.workspaceDifyApiKey,
      campaignId: input.campaignId,
    }),
  );

  return record;
}

export async function enqueueCampaignReplanJob(input: EnqueueReplanJobInput): Promise<void> {
  await input.redis.lpush(
    CAMPAIGN_REPLAN_QUEUE_KEY,
    JSON.stringify({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      reason: input.reason,
      userId: input.userId ?? `worker-${input.workspaceId}`,
    }),
  );
}

export const campaignJobStoreUtils = {
  CAMPAIGN_QUEUE_KEY,
  CAMPAIGN_REPLAN_QUEUE_KEY,
  createProcessingCampaignJob,
  enqueueCampaignJob,
  enqueueCampaignReplanJob,
  getCampaignJob,
  updateCampaignJob,
};
