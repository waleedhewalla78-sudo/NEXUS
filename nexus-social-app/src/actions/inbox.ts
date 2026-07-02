'use server';

import { getConversations, getMessages, sendMessage } from '@/lib/chatwoot/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createActionClient } from '@/lib/supabase/action';

export interface InboxConversation {
  id: string | number;
  contact: {
    name: string;
    avatar_url?: string;
  };
  last_message: {
    content: string;
    created_at: string;
  };
  demoMode?: boolean;
}

export interface InboxMessage {
  id: string | number;
  sender: 'agent' | 'customer';
  content: string;
  created_at: string;
}

function mapChatwootMessages(raw: unknown): InboxMessage[] {
  const data = raw as { payload?: Record<string, unknown>[]; data?: { payload?: Record<string, unknown>[] } };
  const payload = data.payload ?? data.data?.payload ?? (Array.isArray(raw) ? raw : []);

  return (payload as Record<string, unknown>[]).map((msg) => ({
    id: msg.id as string | number,
    sender: (msg.message_type === 1 || msg.message_type === 'outgoing' ? 'agent' : 'customer') as
      | 'agent'
      | 'customer',
    content: (msg.content as string) ?? '',
    created_at: (msg.created_at as string) ?? new Date().toISOString(),
  }));
}

const DEMO_CONVERSATIONS: InboxConversation[] = [
  {
    id: 'demo-1',
    contact: { name: 'Sarah M.' },
    last_message: {
      content: 'Hi, I have a question about pricing.',
      created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
  },
  {
    id: 'demo-2',
    contact: { name: 'James K.' },
    last_message: {
      content: 'Can you help with my order #4821?',
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
  },
  {
    id: 'demo-3',
    contact: { name: 'Alex R.' },
    last_message: {
      content: 'Thanks for the quick reply!',
      created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
  },
];

async function verifyWorkspaceMembership(workspaceId: string) {
  const supabase = await createActionClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('Unauthenticated');

  const { data: member, error: memErr } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('workspace_id', workspaceId)
    .single();

  if (memErr || !member) throw new Error('Unauthorized');
}

async function getAllowedInboxIds(workspaceId: string): Promise<number[]> {
  const { data: channels } = await supabaseAdmin
    .from('channel_credentials')
    .select('chatwoot_inbox_id')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true);

  const fromChannels = channels?.map((c) => c.chatwoot_inbox_id) ?? [];

  const { data: mappings } = await supabaseAdmin
    .from('chatwoot_inbox_workspace_map')
    .select('chatwoot_inbox_id')
    .eq('workspace_id', workspaceId);

  const fromMappings = mappings?.map((m) => m.chatwoot_inbox_id) ?? [];

  return [...new Set([...fromChannels, ...fromMappings])];
}

function mapChatwootConversation(raw: Record<string, unknown>): InboxConversation {
  const meta = (raw.meta as Record<string, unknown>) ?? {};
  const sender = (meta.sender as Record<string, unknown>) ?? {};
  const messages = (raw.messages as Record<string, unknown>[]) ?? [];
  const last = messages[0] ?? {};

  return {
    id: raw.id as string | number,
    contact: {
      name: (sender.name as string) || 'Unknown',
      avatar_url: sender.avatar_url as string | undefined,
    },
    last_message: {
      content: (last.content as string) || 'No messages yet',
      created_at: (last.created_at as string) || new Date().toISOString(),
    },
  };
}

export async function fetchConversations(workspaceId: string): Promise<InboxConversation[]> {
  if (!workspaceId) throw new Error('Workspace ID is required');
  await verifyWorkspaceMembership(workspaceId);

  const allowedInboxIds = await getAllowedInboxIds(workspaceId);
  const data = await getConversations();

  if ((data as { demoMode?: boolean }).demoMode) {
    return DEMO_CONVERSATIONS.map((c) => ({ ...c, demoMode: true }));
  }

  const payload =
    data?.data && Array.isArray(data.data.payload)
      ? data.data.payload
      : Array.isArray(data)
        ? data
        : [];

  const filtered =
    allowedInboxIds.length > 0
      ? payload.filter((conv: { inbox_id: number }) => allowedInboxIds.includes(conv.inbox_id))
      : payload;

  if (filtered.length === 0) {
    return DEMO_CONVERSATIONS.map((c) => ({ ...c, demoMode: true }));
  }

  return filtered.map((conv: Record<string, unknown>) => mapChatwootConversation(conv));
}

export async function fetchMessages(
  workspaceId: string,
  conversationId: string | number,
): Promise<InboxMessage[]> {
  if (!workspaceId) throw new Error('Workspace ID is required');
  await verifyWorkspaceMembership(workspaceId);

  if (String(conversationId).startsWith('demo-')) {
    return mapChatwootMessages({
      payload: [
        {
          id: 1,
          content: 'Hi, I have a question about pricing.',
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          message_type: 0,
        },
        {
          id: 2,
          content: 'Of course! What would you like to know?',
          created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          message_type: 1,
        },
      ],
    });
  }

  const raw = await getMessages(conversationId);
  return mapChatwootMessages(raw);
}

export async function sendReply(workspaceId: string, conversationId: string | number, content: string) {
  if (!workspaceId) throw new Error('Workspace ID is required');
  await verifyWorkspaceMembership(workspaceId);

  if (String(conversationId).startsWith('demo-')) {
    return { content, demoMode: true };
  }

  return sendMessage(conversationId, content);
}
