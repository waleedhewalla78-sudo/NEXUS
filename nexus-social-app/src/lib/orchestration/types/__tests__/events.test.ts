import { describe, expect, it } from 'vitest';

import {

  AI_CMO_INNGEST_EVENT_NAMES,

  aiCmoCampaignRequestedEventSchema,

  aiCmoSignalDetectedEventSchema,

  isAiCmoNamespacedEventName,

} from '@/lib/orchestration/types/events';



describe('004 Inngest event types', () => {

  it('uses ai-cmo namespace', () => {

    expect(isAiCmoNamespacedEventName('ai-cmo/campaign.requested')).toBe(true);

    expect(isAiCmoNamespacedEventName('marketing.campaign.underperforming')).toBe(false);

  });



  it('validates campaign requested payload', () => {

    const parsed = aiCmoCampaignRequestedEventSchema.parse({

      name: AI_CMO_INNGEST_EVENT_NAMES.CAMPAIGN_REQUESTED,

      data: {

        jobId: '550e8400-e29b-41d4-a716-446655440001',

        workspaceId: '550e8400-e29b-41d4-a716-446655440000',

        userId: 'user-1',

        campaignId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',

        objective: 'Launch summer promo',

        idempotencyKey: 'idem-key-1',

        requestedAt: new Date().toISOString(),

      },

    });



    expect(parsed.name).toBe('ai-cmo/campaign.requested');

    expect(parsed.data.objective).toBe('Launch summer promo');

  });



  it('validates signal.detected payload', () => {

    const parsed = aiCmoSignalDetectedEventSchema.parse({

      name: AI_CMO_INNGEST_EVENT_NAMES.SIGNAL_DETECTED,

      data: {

        workspaceId: '550e8400-e29b-41d4-a716-446655440000',

        signalId: 'sig-1',

        headline: 'Trend detected',

        relevanceScore: 0.8,

        detectedAt: new Date().toISOString(),

      },

    });

    expect(parsed.name).toBe('ai-cmo/signal.detected');

  });

});


