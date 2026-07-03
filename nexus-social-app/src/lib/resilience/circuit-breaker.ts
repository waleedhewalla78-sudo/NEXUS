/**
 * Feature 004 Phase 4 — Circuit breaker for external LLM providers.
 *
 * CLOSED: S16-T004 — If HTTP failures exceed 3 in 60 seconds, throw CircuitOpenError
 * to prevent infinite hangs on production cloud APIs.
 *
 * [SPEC] CLOSED -> OPEN (3 consecutive failures) -> HALF_OPEN after 60s cooldown.
 * Redis key: circuit:{provider}:{model}
 */

import defaultRedis from '@/lib/cache';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type CircuitBreakerConfig = {
  provider: string;
  model: string;
  failureThreshold?: number;
  openDurationMs?: number;
};

type CircuitRecord = {
  state: CircuitState;
  consecutiveFailures: number;
  openedAt?: number;
};

export class CircuitOpenError extends Error {
  readonly code = 'CIRCUIT_OPEN';
  readonly provider: string;
  readonly model: string;

  constructor(provider: string, model: string) {
    super(`Circuit open for ${provider}/${model} — failing fast`);
    this.name = 'CircuitOpenError';
    this.provider = provider;
    this.model = model;
  }
}

function circuitKey(provider: string, model: string): string {
  return `circuit:${provider}:${model}`;
}

const inMemoryCircuits = new Map<string, CircuitRecord>();

function getDefaultRecord(): CircuitRecord {
  return { state: 'CLOSED', consecutiveFailures: 0 };
}

export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly openDurationMs: number;

  constructor(private readonly config: CircuitBreakerConfig) {
    this.failureThreshold = config.failureThreshold ?? 3;
    this.openDurationMs = config.openDurationMs ?? 60_000;
  }

  private key(): string {
    return circuitKey(this.config.provider, this.config.model);
  }

  private async loadRecord(): Promise<CircuitRecord> {
    const key = this.key();
    if (defaultRedis) {
      try {
        const raw = await defaultRedis.get(key);
        if (raw) return JSON.parse(raw) as CircuitRecord;
      } catch {
        // fall through to memory
      }
    }
    return inMemoryCircuits.get(key) ?? getDefaultRecord();
  }

  private async saveRecord(record: CircuitRecord): Promise<void> {
    const key = this.key();
    inMemoryCircuits.set(key, record);
    if (defaultRedis) {
      try {
        await defaultRedis.set(key, JSON.stringify(record), 'EX', 300);
      } catch {
        // memory fallback sufficient
      }
    }
  }

  async assertClosed(): Promise<void> {
    const record = await this.loadRecord();
    const now = Date.now();

    if (record.state === 'OPEN') {
      const elapsed = now - (record.openedAt ?? 0);
      if (elapsed >= this.openDurationMs) {
        await this.saveRecord({ ...record, state: 'HALF_OPEN' });
        return;
      }
      throw new CircuitOpenError(this.config.provider, this.config.model);
    }
  }

  async recordSuccess(): Promise<void> {
    await this.saveRecord(getDefaultRecord());
  }

  async recordFailure(): Promise<void> {
    const record = await this.loadRecord();
    const consecutiveFailures = record.consecutiveFailures + 1;

    if (consecutiveFailures >= this.failureThreshold) {
      await this.saveRecord({
        state: 'OPEN',
        consecutiveFailures,
        openedAt: Date.now(),
      });
      return;
    }

    await this.saveRecord({
      state: record.state === 'HALF_OPEN' ? 'OPEN' : 'CLOSED',
      consecutiveFailures,
      openedAt: record.state === 'HALF_OPEN' ? Date.now() : record.openedAt,
    });
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.assertClosed();
    try {
      const result = await fn();
      await this.recordSuccess();
      return result;
    } catch (error) {
      await this.recordFailure();
      throw error;
    }
  }
}

const breakerCache = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(provider: string, model: string): CircuitBreaker {
  const key = circuitKey(provider, model);
  if (!breakerCache.has(key)) {
    breakerCache.set(key, new CircuitBreaker({ provider, model }));
  }
  return breakerCache.get(key)!;
}

export function resetCircuitBreakersForTests(): void {
  breakerCache.clear();
  inMemoryCircuits.clear();
}

export const circuitBreakerUtils = {
  CircuitBreaker,
  CircuitOpenError,
  getCircuitBreaker,
  resetCircuitBreakersForTests,
};
