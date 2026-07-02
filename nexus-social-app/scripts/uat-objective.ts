import { randomUUID } from 'node:crypto';

const UAT_TOPICS = [
  'vertical farming automation for desert agriculture',
  'pet insurance comparison for senior dog owners',
  'carbon credit marketplace for SME manufacturers',
  'remote patient monitoring for rural clinics',
  'modular kitchen design for tiny homes',
  'cyber insurance for freelance consultants',
  'sustainable packaging for D2C cosmetics',
  'employee wellness stipends for hybrid teams',
] as const;

/** Unique objective per UAT run — random topic + run id so captions differ from prior corpus. */
export function buildUniqueUatObjective(base?: string): string {
  const runId = randomUUID().slice(0, 8);
  const ts = new Date().toISOString().slice(0, 19);
  const topic = base?.trim() || UAT_TOPICS[Math.floor(Math.random() * UAT_TOPICS.length)]!;
  return `Launch campaign: ${topic}. Include exact token uat-${runId} in the headline. [uat:${ts}:${runId}]`;
}

export const UAT_HAPPY_PATH_OBJECTIVE_BASE =
  'Promote a one-time B2B SaaS webinar on AI governance for enterprise marketing leaders';
