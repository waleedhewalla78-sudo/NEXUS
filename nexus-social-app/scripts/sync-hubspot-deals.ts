/**
 * Batch pull HubSpot closed-won deals into crm_activity_mirror.
 * Usage: npm run sync:hubspot-deals
 *
 * Requires: HUBSPOT_ACCESS_TOKEN, NEXT_PUBLIC_DEFAULT_WORKSPACE_ID (or HUBSPOT_WEBHOOK_WORKSPACE_ID)
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mirrorCrmActivity } from '../src/lib/ai-cmo/abm/crm-sync';
import { isClosedWonStageValue } from '../src/lib/ai-cmo/abm/hubspot-webhook';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  for (const file of ['.env', '.env.local']) {
    const p = join(root, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

type HubSpotDeal = {
  id: string;
  properties?: Record<string, string | null>;
};

async function searchClosedWonDeals(token: string): Promise<HubSpotDeal[]> {
  const res = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'dealstage',
              operator: 'CONTAINS_TOKEN',
              value: 'closedwon',
            },
          ],
        },
      ],
      properties: ['dealstage', 'amount', 'closedate', 'domain', 'hs_object_id'],
      limit: 100,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot search failed ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { results?: HubSpotDeal[] };
  return json.results ?? [];
}

async function main() {
  loadEnv();

  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  const workspaceId =
    process.env.HUBSPOT_WEBHOOK_WORKSPACE_ID ??
    process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID;

  if (!token) {
    console.error('[sync-hubspot] Missing HUBSPOT_ACCESS_TOKEN');
    process.exit(1);
  }
  if (!workspaceId) {
    console.error('[sync-hubspot] Missing workspace id env');
    process.exit(1);
  }

  console.log('\n=== HubSpot closed-won sync ===');
  const deals = await searchClosedWonDeals(token);
  console.log(`Found ${deals.length} deals`);

  let mirrored = 0;
  for (const deal of deals) {
    const stage = deal.properties?.dealstage ?? '';
    if (!isClosedWonStageValue(stage) && !/closed/i.test(stage)) continue;

    const amountRaw = deal.properties?.amount;
    const dealValue = amountRaw != null && Number.isFinite(Number(amountRaw)) ? Number(amountRaw) : null;
    const domain = deal.properties?.domain?.trim().toLowerCase() ?? null;

    const result = await mirrorCrmActivity({
      workspaceId,
      userId: 'hubspot-sync-script',
      crmPlatform: 'hubspot',
      accountId: `hubspot-deal-${deal.id}`,
      accountDomain: domain,
      activityType: 'closed_won',
      dealValue,
      payload: { source: 'hubspot_batch_sync', dealId: deal.id, stage },
    });

    if (result.ok) mirrored += 1;
    else console.warn(`  skip deal ${deal.id}: ${result.error}`);
  }

  console.log(`Mirrored ${mirrored}/${deals.length} closed-won deals`);
  console.log('✓ sync complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
