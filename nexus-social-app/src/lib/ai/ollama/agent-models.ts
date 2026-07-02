/**
 * Per-agent Ollama model resolution (local LLM backbone).
 * Env: OLLAMA_MODEL_<ROLE> e.g. OLLAMA_MODEL_STRATEGIC_BRAIN=llama3.1:8b
 */

export const OLLAMA_AGENT_ROLES = [
  'strategic_brain',
  'creator',
  'quality_judge',
  'optimizer',
  'radar',
  'quant',
  'sentinel',
  'finance',
  'compliance',
  'inbox',
  'copilot',
  'caption',
  'copilot_router',
] as const;

export type OllamaAgentRole = (typeof OLLAMA_AGENT_ROLES)[number];

const DEFAULT_BY_ROLE: Record<OllamaAgentRole, string> = {
  strategic_brain: 'llama3.1:8b',
  creator: 'llama3.1:8b',
  quality_judge: 'llama3.1:8b',
  optimizer: 'llama3.2',
  radar: 'llama3.2',
  quant: 'llama3.2',
  sentinel: 'llama3.2',
  finance: 'llama3.2',
  compliance: 'llama3.1:8b',
  inbox: 'llama3.1:8b',
  copilot: 'llama3.1:8b',
  caption: 'llama3.2',
  copilot_router: 'llama3.2',
};

function envKeyForRole(role: string): string {
  return `OLLAMA_MODEL_${role.toUpperCase().replace(/-/g, '_')}`;
}

export function isLocalOllamaEnabled(): boolean {
  return (process.env.USE_LOCAL_OLLAMA ?? 'false').toLowerCase() === 'true';
}

export function isOllamaOnlyMode(): boolean {
  return (process.env.OLLAMA_ONLY ?? 'false').toLowerCase() === 'true';
}

export function resolveOllamaModelForAgent(agentRole?: string): string {
  const fallback = process.env.OLLAMA_MODEL ?? 'llama3.2';
  if (!agentRole) return fallback;

  const normalized = agentRole.toLowerCase().replace(/-/g, '_') as OllamaAgentRole;
  const envKey = envKeyForRole(normalized);
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;

  return DEFAULT_BY_ROLE[normalized] ?? fallback;
}

export function resolveOllamaTimeoutMs(): number {
  const raw = process.env.OLLAMA_TIMEOUT_MS ?? '300000';
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 120_000;
}

export function listOllamaAgentModelConfig(): Array<{ role: string; model: string; envKey: string }> {
  return OLLAMA_AGENT_ROLES.map((role) => ({
    role,
    model: resolveOllamaModelForAgent(role),
    envKey: envKeyForRole(role),
  }));
}
