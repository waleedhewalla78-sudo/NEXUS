/**
 * Ollama instance health + model inventory (for verification scripts and Copilot status).
 */

import { normalizeOllamaBaseUrl } from '@/lib/ai/providers/ollama-provider';
import { resolveOllamaModelForAgent } from '@/lib/ai/ollama/agent-models';

export type OllamaHealthResult = {
  ok: boolean;
  baseUrl: string;
  models: string[];
  error?: string;
};

let modelCache: { at: number; models: string[] } | null = null;
const MODEL_CACHE_MS = 30_000;

export async function getOllamaModelInventory(
  baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
): Promise<string[]> {
  const now = Date.now();
  if (modelCache && now - modelCache.at < MODEL_CACHE_MS) {
    return modelCache.models;
  }

  const health = await checkOllamaHealth(baseUrl);
  if (health.ok) {
    modelCache = { at: now, models: health.models };
    return health.models;
  }
  return [];
}

/** Map configured model names (e.g. llama3.1:8b) to tags returned by `ollama list`. */
export function matchOllamaModelName(requested: string, available: string[]): string | null {
  if (!available.length) return null;

  const req = requested.trim();
  const reqLower = req.toLowerCase();

  if (available.includes(req)) return req;

  const exactIgnoreCase = available.find((m) => m.toLowerCase() === reqLower);
  if (exactIgnoreCase) return exactIgnoreCase;

  const [base, tag] = req.split(':');
  const baseLower = base.toLowerCase();
  const tagLower = tag?.toLowerCase();

  for (const name of available) {
    const nl = name.toLowerCase();
    if (tagLower && nl.includes(baseLower) && nl.includes(tagLower)) return name;
    if (nl.endsWith(`/${req}`) || nl.endsWith(`/${reqLower}`)) return name;
    if (nl.includes(reqLower.replace(':', '-'))) return name;
  }

  if (baseLower.includes('llama3.2') || baseLower === 'llama3.2') {
    const llama32 = available.find((m) => m.toLowerCase().includes('llama3.2'));
    if (llama32) return llama32;
    const llama31 = available.find(
      (m) => m.toLowerCase().includes('llama3.1') && m.toLowerCase().includes('8b'),
    );
    if (llama31) return llama31;
  }

  if (baseLower.includes('llama3.1')) {
    const llama31 = available.find(
      (m) => m.toLowerCase().includes('llama3.1') && (!tagLower || m.toLowerCase().includes(tagLower)),
    );
    if (llama31) return llama31;
  }

  return null;
}

export async function resolveOllamaRuntimeModel(agentRole?: string): Promise<string> {
  const requested = resolveOllamaModelForAgent(agentRole);
  const inventory = await getOllamaModelInventory();
  return matchOllamaModelName(requested, inventory) ?? requested;
}

export function isOllamaModelAvailable(requested: string, available: string[]): boolean {
  return matchOllamaModelName(requested, available) !== null;
}

export async function checkOllamaHealth(
  baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
): Promise<OllamaHealthResult> {
  const normalized = normalizeOllamaBaseUrl(baseUrl).replace(/\/v1$/, '');

  try {
    const res = await fetch(`${normalized}/api/tags`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { ok: false, baseUrl: normalized, models: [], error: `HTTP ${res.status}` };
    }
    const body = (await res.json()) as { models?: Array<{ name?: string }> };
    const models = (body.models ?? []).map((m) => m.name).filter(Boolean) as string[];
    return { ok: true, baseUrl: normalized, models };
  } catch (err) {
    return {
      ok: false,
      baseUrl: normalized,
      models: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function assertOllamaModelAvailable(model: string): Promise<boolean> {
  const health = await checkOllamaHealth();
  if (!health.ok) return false;
  return isOllamaModelAvailable(model, health.models);
}
