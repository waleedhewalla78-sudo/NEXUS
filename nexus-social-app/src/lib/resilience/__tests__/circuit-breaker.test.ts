import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitOpenError,
  resetCircuitBreakersForTests,
} from '@/lib/resilience/circuit-breaker';

vi.mock('@/lib/cache', () => ({
  default: null,
}));

describe('CircuitBreaker', () => {
  beforeEach(() => {
    resetCircuitBreakersForTests();
  });

  it('opens after three consecutive failures', async () => {
    const breaker = new CircuitBreaker({ provider: 'test', model: 'm1', failureThreshold: 3 });

    await breaker.recordFailure();
    await breaker.recordFailure();
    await breaker.recordFailure();

    await expect(breaker.assertClosed()).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it('fails fast when circuit is open', async () => {
    const breaker = new CircuitBreaker({ provider: 'test', model: 'm2', failureThreshold: 2 });

    await expect(
      breaker.execute(async () => {
        throw new Error('provider down');
      }),
    ).rejects.toThrow('provider down');

    await expect(
      breaker.execute(async () => {
        throw new Error('provider down');
      }),
    ).rejects.toThrow('provider down');

    await expect(
      breaker.execute(async () => 'should not run'),
    ).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it('resets to closed after success', async () => {
    const breaker = new CircuitBreaker({ provider: 'test', model: 'm3', failureThreshold: 3 });

    await breaker.recordFailure();
    await breaker.recordSuccess();

    await expect(breaker.assertClosed()).resolves.toBeUndefined();
  });
});
