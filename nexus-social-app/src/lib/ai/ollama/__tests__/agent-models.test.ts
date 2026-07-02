import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  resolveOllamaModelForAgent,
  isOllamaOnlyMode,
  listOllamaAgentModelConfig,
} from '@/lib/ai/ollama/agent-models';

describe('ollama agent-models', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('resolves per-role env override', () => {
    process.env.OLLAMA_MODEL = 'llama3.2';
    process.env.OLLAMA_MODEL_STRATEGIC_BRAIN = 'llama3.1:8b';
    expect(resolveOllamaModelForAgent('strategic_brain')).toBe('llama3.1:8b');
    expect(resolveOllamaModelForAgent('radar')).toBe('llama3.2');
  });

  it('detects OLLAMA_ONLY mode', () => {
    process.env.OLLAMA_ONLY = 'true';
    expect(isOllamaOnlyMode()).toBe(true);
  });

  it('lists all agent roles', () => {
    const rows = listOllamaAgentModelConfig();
    expect(rows.some((r) => r.role === 'copilot')).toBe(true);
    expect(rows.some((r) => r.role === 'quality_judge')).toBe(true);
  });
});
