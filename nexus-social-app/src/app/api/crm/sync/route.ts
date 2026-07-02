import { NextResponse } from 'next/server';
import { verifyInternalBearer, unauthorizedInternalResponse } from '@/lib/internal-auth';

export async function POST(req: Request) {
  if (!verifyInternalBearer(req)) {
    return unauthorizedInternalResponse();
  }

  try {
    const body = await req.json();
    const { leadData, crmPlatform } = body;

    if (!leadData || !crmPlatform) {
      return NextResponse.json({ error: 'Missing leadData or crmPlatform' }, { status: 400 });
    }

    const crmWebhookUrl = process.env.CRM_WEBHOOK_URL;
    if (!crmWebhookUrl) {
      return NextResponse.json({ error: 'CRM_WEBHOOK_URL not configured' }, { status: 503 });
    }

    let payload: Record<string, unknown> = {};
    if (crmPlatform === 'Salesforce') {
      payload = {
        Company: leadData.company,
        LastName: leadData.name,
        Email: leadData.email,
        Description: `Lead captured via Nexus AI Intent Detector. Sentiment: ${leadData.sentiment}`,
        LeadSource: 'Nexus Social Automation',
      };
    } else if (crmPlatform === 'HubSpot') {
      payload = {
        properties: {
          company: leadData.company,
          email: leadData.email,
          firstname: leadData.name,
          hs_lead_status: 'NEW',
          message: `Lead captured via Nexus AI Intent Detector. Sentiment: ${leadData.sentiment}`,
        },
      };
    } else {
      payload = { ...leadData, source: 'Nexus Social Automation' };
    }

    const response = await fetch(crmWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`CRM sync failed with status ${response.status}`);
    }

    return NextResponse.json({ success: true, message: `Lead successfully synced to ${crmPlatform}` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CRM_SYNC_ERROR]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
