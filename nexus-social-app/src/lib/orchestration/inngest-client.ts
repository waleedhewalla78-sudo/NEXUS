/**
 * Feature 004 — Inngest L3 orchestration client (separate from 003 Redis BRPOP queues).
 */

import { Inngest } from 'inngest';
import {
  AI_CMO_INNGEST_EVENT_NAMES,
  type AiCmoInngestEvent,
  isAiCmoNamespacedEventName,
} from '@/lib/orchestration/types/events';

function assertAiCmoEventNamespace(name: string): void {
  if (!isAiCmoNamespacedEventName(name)) {
    throw new Error(
      `Inngest event "${name}" must use ai-cmo/ namespace (004). 003 events use Redis marketing bus.`,
    );
  }
}

let cachedClient: Inngest | null = null;

export function getInngestClient(): Inngest {
  if (!cachedClient) {
    cachedClient = new Inngest({
      id: 'nexus-ai-cmo',
      eventKey: process.env.INNGEST_EVENT_KEY,
    });
  }
  return cachedClient;
}

export async function sendAiCmoInngestEvent(event: AiCmoInngestEvent): Promise<{ ids: string[] }> {
  assertAiCmoEventNamespace(event.name);
  const client = getInngestClient();
  return client.send({ name: event.name, data: event.data as Record<string, unknown> });
}

export function resetInngestClientForTests(): void {
  cachedClient = null;
}

/** @deprecated use getInngestClient() — kept for legacy isStub checks in tests */
export function isInngestStubClient(): boolean {
  return false;
}

export const inngestClientUtils = {
  getInngestClient,
  sendAiCmoInngestEvent,
  AI_CMO_INNGEST_EVENT_NAMES,
};
