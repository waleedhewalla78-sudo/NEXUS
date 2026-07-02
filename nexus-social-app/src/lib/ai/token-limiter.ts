import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Task 2: Cost Controls & Token Limit Enforcement
 * Handles the Redis circuit breakers to prevent LLM API billing bankruptcy.
 */
export async function checkLimit(workspaceId: string, dailyLimit: number): Promise<boolean> {
  const date = new Date().toISOString().split('T')[0];
  const key = `ai_tokens:${workspaceId}:${date}`;
  
  try {
    const currentTokens = await redis.get(key);
    if (!currentTokens) return true; // Under limit if key doesn't exist
    return parseInt(currentTokens, 10) < dailyLimit;
  } catch (error) {
    console.error('[Token Limiter] Redis failed, failing closed for safety:', error);
    // Edge Case 1: Fail closed if Redis dies to prevent runaway LLM costs. 
    return false; 
  }
}

export async function incrementTokens(workspaceId: string, tokensUsed: number): Promise<void> {
  if (!tokensUsed || tokensUsed <= 0) return;

  const date = new Date().toISOString().split('T')[0];
  const key = `ai_tokens:${workspaceId}:${date}`;
  
  try {
    const multi = redis.multi();
    multi.incrby(key, tokensUsed);
    // Ensure key expires after 24 hours to prevent memory leaks
    multi.expire(key, 86400); 
    await multi.exec();
  } catch (error) {
    console.error('[Token Limiter] Failed to increment tokens in Redis:', error);
  }
}
