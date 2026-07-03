/**
 * Thrown when Dify + OpenRouter (and optional Ollama) are all unavailable.
 * Inngest workflows can retry on this error safely.
 */
// CLOSED: S16-T004
export class AIProviderUnavailableError extends Error {
  readonly code = 'AI_PROVIDER_UNAVAILABLE';

  constructor(public readonly attemptedProviders: string[]) {
    super(
      `All AI providers unavailable (attempted: ${attemptedProviders.join(', ') || 'none'})`,
    );
    this.name = 'AIProviderUnavailableError';
  }
}
