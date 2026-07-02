'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import Redis from 'ioredis';
import * as Sentry from '@sentry/nextjs';

const WORKER_HEARTBEAT_KEY = 'worker:heartbeat';

async function pingDependency(url: string): Promise<boolean> {
  if (!url) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function pingRedis(): Promise<'up' | 'down'> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = new Redis(redisUrl, {
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  try {
    await client.connect();
    const pong = await Promise.race([
      client.ping(),
      new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('redis ping timeout')), 2000);
      }),
    ]);
    return pong === 'PONG' ? 'up' : 'down';
  } catch {
    return 'down';
  } finally {
    client.disconnect();
  }
}

async function pingWorkerQueue(): Promise<'up' | 'down' | 'unknown'> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = new Redis(redisUrl, {
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  try {
    await client.connect();
    const heartbeat = await client.get(WORKER_HEARTBEAT_KEY);
    return heartbeat ? 'up' : 'unknown';
  } catch {
    return 'down';
  } finally {
    client.disconnect();
  }
}

async function pingSchemaReadiness(): Promise<'up' | 'down'> {
  try {
    const { error } = await supabaseAdmin.from('post_analytics').select('id').limit(1);
    if (error) {
      const msg = error.message?.toLowerCase() ?? '';
      if (
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        msg.includes('does not exist') ||
        msg.includes('schema cache')
      ) {
        return 'down';
      }
    }
    return 'up';
  } catch {
    return 'down';
  }
}

export async function checkSystemHealth() {
  const status = {
    db: 'unknown' as 'unknown' | 'up' | 'down',
    redis: 'unknown' as 'unknown' | 'up' | 'down',
    worker: 'unknown' as 'unknown' | 'up' | 'down',
    schema: 'unknown' as 'unknown' | 'up' | 'down',
    chatwoot: 'unknown' as 'unknown' | 'up' | 'down',
    dify: 'unknown' as 'unknown' | 'up' | 'down',
    activepieces: 'unknown' as 'unknown' | 'up' | 'down',
    overall: 'healthy' as 'healthy' | 'down',
  };

  try {
    const { error: dbError } = await supabaseAdmin.from('workspaces').select('id').limit(1);
    status.db = dbError ? 'down' : 'up';
    if (dbError) {
      status.overall = 'down';
      Sentry.captureMessage(`Database health check failed: ${dbError.message}`, 'error');
    }

    status.redis = await pingRedis();
    status.worker = await pingWorkerQueue();
    status.schema = await pingSchemaReadiness();

    if (status.redis === 'down' && process.env.NODE_ENV === 'production') {
      status.overall = 'down';
    }
    if (status.schema === 'down' && process.env.NODE_ENV === 'production') {
      status.overall = 'down';
    }

    const publishingEnabled = (process.env.PUBLISHING_ENABLED ?? 'true').toLowerCase() !== 'false';
    if (
      process.env.NODE_ENV === 'production' &&
      publishingEnabled &&
      status.worker !== 'up'
    ) {
      status.overall = 'down';
    }

    const chatwootBase = process.env.CHATWOOT_BASE_URL?.replace(/\/$/, '') ?? '';
    status.chatwoot = chatwootBase
      ? (await pingDependency(`${chatwootBase}/api`)) ? 'up' : 'down'
      : 'unknown';

    const difyBase = process.env.DIFY_BASE_URL?.replace(/\/$/, '') ?? '';
    status.dify = difyBase
      ? (await pingDependency(`${difyBase}/health`)) ? 'up' : 'down'
      : 'unknown';

    const activepiecesBase = process.env.ACTIVEPIECES_BASE_URL?.replace(/\/$/, '') ?? '';
    status.activepieces = activepiecesBase
      ? (await pingDependency(activepiecesBase)) ? 'up' : 'down'
      : 'unknown';

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      if (status.chatwoot === 'down' || status.dify === 'down') {
        status.overall = 'down';
      }
    }
  } catch (error) {
    status.overall = 'down';
    Sentry.captureException(error);
  }

  return status;
}
