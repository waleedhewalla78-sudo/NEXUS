import crypto from 'crypto';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const QUEUE_KEY = 'queue:webhook-delivery';
const MAX_ATTEMPTS = 5;

export interface WebhookDeliveryJob {
  url: string;
  secret: string;
  payloadString: string;
  attempt: number;
}

export async function enqueueWebhookDelivery({
  url,
  secret,
  payloadString,
}: {
  url: string;
  secret: string;
  payloadString: string;
}) {
  const job: WebhookDeliveryJob = { url, secret, payloadString, attempt: 1 };
  await redis.lpush(QUEUE_KEY, JSON.stringify(job));
}

export async function deliverWebhook(job: WebhookDeliveryJob): Promise<boolean> {
  const signature = crypto.createHmac('sha256', job.secret).update(job.payloadString).digest('hex');

  const response = await fetch(job.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Nexus-Signature': `sha256=${signature}`,
    },
    body: job.payloadString,
    signal: AbortSignal.timeout(10_000),
  });

  return response.ok;
}

export async function processWebhookDeliveryQueueOnce(): Promise<void> {
  const raw = await redis.rpop(QUEUE_KEY);
  if (!raw) return;

  const job = JSON.parse(raw) as WebhookDeliveryJob;

  try {
    const ok = await deliverWebhook(job);
    if (!ok && job.attempt < MAX_ATTEMPTS) {
      const retry: WebhookDeliveryJob = { ...job, attempt: job.attempt + 1 };
      const delayMs = Math.min(1000 * 2 ** job.attempt, 30_000);
      setTimeout(() => {
        redis.lpush(QUEUE_KEY, JSON.stringify(retry)).catch(console.error);
      }, delayMs);
    }
  } catch (err) {
    console.error(`[Webhook] Delivery error for ${job.url}:`, err);
    if (job.attempt < MAX_ATTEMPTS) {
      const retry: WebhookDeliveryJob = { ...job, attempt: job.attempt + 1 };
      await redis.lpush(QUEUE_KEY, JSON.stringify(retry));
    }
  }
}

export async function startWebhookDeliveryConsumer() {
  console.log('[Worker] Started webhook delivery consumer loop.');
  while (true) {
    try {
      const result = await redis.brpop(QUEUE_KEY, 5);
      if (!result) continue;

      const job = JSON.parse(result[1]) as WebhookDeliveryJob;
      const ok = await deliverWebhook(job);
      if (!ok && job.attempt < MAX_ATTEMPTS) {
        const retry: WebhookDeliveryJob = { ...job, attempt: job.attempt + 1 };
        const delayMs = Math.min(1000 * 2 ** job.attempt, 30_000);
        await new Promise((r) => setTimeout(r, delayMs));
        await redis.lpush(QUEUE_KEY, JSON.stringify(retry));
      }
    } catch (err) {
      console.error('[Worker] Webhook delivery loop error:', err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
