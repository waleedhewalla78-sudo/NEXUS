'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { createActionClient } from '@/lib/supabase/action';
import { getConfig, getHeaders } from '@/lib/chatwoot/client';

/**
 * Ensures the user making the request belongs to the given workspace.
 */
async function verifyWorkspaceMembership(workspaceId: string) {
  const supabase = await createActionClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('Unauthenticated');
  }

  const { data: member, error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('workspace_id', workspaceId)
    .single();

  if (memberError || !member) {
    throw new Error('Unauthorized: You are not a member of this workspace.');
  }

  return session.user.id;
}

/**
 * Provisions a WhatsApp channel via Chatwoot API and saves credentials.
 */
export async function provisionWhatsAppChannel(workspaceId: string, phoneNumber: string, metaAccessToken: string) {
  await verifyWorkspaceMembership(workspaceId);

  const { BASE_URL, API_TOKEN, ACCOUNT_ID } = getConfig();
  if (!BASE_URL || !API_TOKEN || !ACCOUNT_ID) {
    throw new Error('Chatwoot configuration is missing.');
  }

  // Call Chatwoot API to create the WhatsApp inbox/channel
  const chatwootPayload = {
    name: `WhatsApp - ${phoneNumber}`,
    channel: {
      type: 'whatsapp',
      phone_number: phoneNumber,
      provider_config: {
        api_key: metaAccessToken,
        phone_number_id: phoneNumber // In a real implementation, you might need the specific Phone Number ID
      }
    }
  };

  const url = `${BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/inboxes`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(API_TOKEN),
    body: JSON.stringify(chatwootPayload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Failed to provision WhatsApp channel in Chatwoot:', errorText);
    throw new Error('Failed to provision WhatsApp channel in Chatwoot.');
  }

  const chatwootData = await res.json();
  const inboxId = chatwootData.id;

  // Save the mapping to our database
  const { error: dbError } = await supabaseAdmin
    .from('channel_credentials')
    .insert({
      workspace_id: workspaceId,
      channel_type: 'whatsapp',
      provider: 'meta',
      chatwoot_inbox_id: inboxId,
      phone_number: phoneNumber,
      encrypted_credentials: { access_token: metaAccessToken } // In a real app, this should be properly encrypted before inserting, but currently we use JSONB.
    });

  if (dbError) {
    console.error('Database error mapping inbox:', dbError);
    throw new Error('Failed to save channel mapping to the database.');
  }

  return { success: true, inboxId };
}

/**
 * Provisions an SMS channel via Twilio into Chatwoot and saves credentials.
 */
export async function provisionSmsChannel(workspaceId: string, phoneNumber: string, twilioAccountSid: string, twilioAuthToken: string) {
  await verifyWorkspaceMembership(workspaceId);

  const { BASE_URL, API_TOKEN, ACCOUNT_ID } = getConfig();
  if (!BASE_URL || !API_TOKEN || !ACCOUNT_ID) {
    throw new Error('Chatwoot configuration is missing.');
  }

  // Call Chatwoot API to create the Twilio SMS inbox/channel
  const chatwootPayload = {
    name: `SMS - ${phoneNumber}`,
    channel: {
      type: 'twilio_sms',
      phone_number: phoneNumber,
      provider_config: {
        account_sid: twilioAccountSid,
        auth_token: twilioAuthToken
      }
    }
  };

  const url = `${BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/inboxes`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(API_TOKEN),
    body: JSON.stringify(chatwootPayload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Failed to provision SMS channel in Chatwoot:', errorText);
    throw new Error('Failed to provision SMS channel in Chatwoot.');
  }

  const chatwootData = await res.json();
  const inboxId = chatwootData.id;

  // Save the mapping to our database
  const { error: dbError } = await supabaseAdmin
    .from('channel_credentials')
    .insert({
      workspace_id: workspaceId,
      channel_type: 'sms',
      provider: 'twilio',
      chatwoot_inbox_id: inboxId,
      phone_number: phoneNumber,
      encrypted_credentials: { account_sid: twilioAccountSid, auth_token: twilioAuthToken }
    });

  if (dbError) {
    console.error('Database error mapping inbox:', dbError);
    throw new Error('Failed to save channel mapping to the database.');
  }

  return { success: true, inboxId };
}
