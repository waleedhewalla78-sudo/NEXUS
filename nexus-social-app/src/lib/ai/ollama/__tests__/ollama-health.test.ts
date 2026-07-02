import { describe, expect, it } from 'vitest';
import { matchOllamaModelName } from '@/lib/ai/ollama/ollama-health';

const SAMPLE_INVENTORY = [
  'mani12maran05/llama3.1:8b',
  'llama3.1:8b-instruct-q4_K_M',
  'batiai/gemma4-12b:iq4',
];

describe('matchOllamaModelName', () => {
  it('matches exact name', () => {
    expect(matchOllamaModelName('llama3.1:8b-instruct-q4_K_M', SAMPLE_INVENTORY)).toBe(
      'llama3.1:8b-instruct-q4_K_M',
    );
  });

  it('resolves llama3.1:8b to namespaced or instruct variant', () => {
    const resolved = matchOllamaModelName('llama3.1:8b', SAMPLE_INVENTORY);
    expect(resolved).toBeTruthy();
    expect(resolved!.toLowerCase()).toContain('llama3.1');
  });

  it('falls back llama3.2 to llama3.1 8b when 3.2 missing', () => {
    const resolved = matchOllamaModelName('llama3.2', SAMPLE_INVENTORY);
    expect(resolved).toBeTruthy();
    expect(resolved!.toLowerCase()).toMatch(/llama3\.1/);
  });
});
