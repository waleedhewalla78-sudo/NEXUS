import { describe, expect, it } from 'vitest';
import {
  extractClosedWonDeals,
  isClosedWonStageValue,
} from '@/lib/ai-cmo/abm/hubspot-webhook';
import {
  isClosedWonOpportunity,
  parseSalesforceClosedWon,
} from '@/lib/ai-cmo/abm/salesforce-webhook';
import {
  getRulesForProfile,
  isValidComplianceProfileId,
  MENA_V1_PROFILE_ID,
} from '@/lib/governance/compliance-profiles/mena-v1';

describe('Sprint 19 CRM + compliance utilities', () => {
  it('links closed-won HubSpot deals with amount', () => {
    const deals = extractClosedWonDeals([
      {
        subscriptionType: 'deal.propertyChange',
        objectId: 42,
        propertyName: 'dealstage',
        propertyValue: 'closedwon',
      },
      {
        subscriptionType: 'deal.propertyChange',
        objectId: 42,
        propertyName: 'amount',
        propertyValue: '10000',
      },
    ]);
    expect(deals[0]?.dealValue).toBe(10_000);
  });

  it('parses Salesforce closed-won opportunity', () => {
    expect(
      parseSalesforceClosedWon({
        Id: '006xx',
        StageName: 'Closed Won',
        Amount: 5000,
        Account: { Website: 'https://vodafone.com.eg' },
      }),
    ).toMatchObject({
      accountId: 'salesforce-opp-006xx',
      dealValue: 5000,
      accountDomain: 'vodafone.com.eg',
    });
    expect(isClosedWonOpportunity({ StageName: 'Prospecting' })).toBe(false);
  });

  it('exposes MENA v1 compliance rules', () => {
    const rules = getRulesForProfile(MENA_V1_PROFILE_ID);
    expect(rules.length).toBeGreaterThan(0);
    expect(isValidComplianceProfileId('mena_v1')).toBe(true);
    expect(isValidComplianceProfileId('invalid')).toBe(false);
  });

  it('detects closed won stage variants', () => {
    expect(isClosedWonStageValue('Closed Won')).toBe(true);
    expect(isClosedWonStageValue('qualified')).toBe(false);
  });
});
