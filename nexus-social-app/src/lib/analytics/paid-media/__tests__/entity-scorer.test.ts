import { describe, expect, it } from 'vitest';
import { aggregateKpis } from '../kpi-calculator';
import { classifyEntity, scoreEntitiesByField, scoreEntityKpis } from '../entity-scorer';
import type { MappedRow } from '../kpi-calculator';

function row(partial: Partial<MappedRow>): MappedRow {
  const base = {
    date: null,
    platform: null,
    account: null,
    campaign_name: null,
    adset_name: null,
    ad_name: null,
    objective: null,
    spend: null,
    impressions: null,
    reach: null,
    frequency: null,
    clicks: null,
    link_clicks: null,
    landing_page_views: null,
    add_to_cart: null,
    initiate_checkout: null,
    purchases: null,
    leads: null,
    revenue: null,
    video_views: null,
    thumbstop: null,
  };
  return { ...base, ...partial };
}

describe('entity-scorer', () => {
  it('classifies high performers as Scale', () => {
    expect(classifyEntity(75, 10)).toBe('Scale');
    expect(classifyEntity(75, 0)).toBe('Optimize');
    expect(classifyEntity(25, 0)).toBe('Pause');
  });

  it('scores winner above median ROAS', () => {
    const medians = { roas: 2, cpa: 50, ctr: 0.02, cpm: 10 };
    const winner = aggregateKpis([
      row({ campaign_name: 'A', spend: 100, revenue: 400, clicks: 50, impressions: 1000, purchases: 5 }),
    ]);
    const score = scoreEntityKpis(winner, medians);
    expect(score).toBeGreaterThan(50);
  });

  it('groups campaigns and ranks by score', () => {
    const rows = [
      row({
        campaign_name: 'Winner',
        spend: 200,
        revenue: 800,
        clicks: 100,
        impressions: 2000,
        purchases: 20,
      }),
      row({
        campaign_name: 'Loser',
        spend: 500,
        revenue: 100,
        clicks: 50,
        impressions: 5000,
        purchases: 2,
      }),
    ];
    const scored = scoreEntitiesByField(rows, 'campaign_name');
    expect(scored[0]!.name).toBe('Winner');
    expect(scored[0]!.status).toBe('Scale');
  });
});
