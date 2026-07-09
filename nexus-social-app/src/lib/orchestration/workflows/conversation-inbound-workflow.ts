/**
 * Feature 006 Sprint 2 — CONVERSATION_INBOUND Inngest workflow (CL-030 additive).
 */

import { getInngestClient } from '@/lib/orchestration/inngest-client';
import {
  CONVERSATION_INBOUND_EVENT,
  processConversationInbound,
  type ConversationInboundInput,
} from '@/lib/ai-cmo/conversation/process-inbound';

export { CONVERSATION_INBOUND_EVENT };

export async function requestConversationInbound(input: ConversationInboundInput): Promise<void> {
  const client = getInngestClient();
  await client.send({
    name: CONVERSATION_INBOUND_EVENT,
    data: {
      ...input,
      requestedAt: new Date().toISOString(),
    },
  });
}

export function getConversationInboundInngestFunctions(): unknown[] {
  const inngest = getInngestClient();

  const onInbound = inngest.createFunction(
    {
      id: 'conversation-inbound',
      name: 'Conversation Inbound (Concierge / Shadow)',
      triggers: [{ event: CONVERSATION_INBOUND_EVENT }],
    },
    async ({ event }) => {
      const data = event.data as ConversationInboundInput;
      if (!data.workspaceId || !data.conversationId) {
        throw new Error('workspaceId and conversationId required');
      }
      return processConversationInbound(data);
    },
  );

  return [onInbound];
}
