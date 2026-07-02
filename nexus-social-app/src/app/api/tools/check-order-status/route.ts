import { NextResponse } from 'next/server';
import { z } from 'zod';

const OrderSchema = z.object({
  order_id: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const secret = process.env.INTERNAL_TOOL_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized tool access' }, { status: 401 });
    }

    const payload = await req.json();
    const parsed = OrderSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters', details: parsed.error }, { status: 400 });
    }

    const { order_id } = parsed.data;

    const result = await Promise.race([
      lookupOrder(order_id),
      new Promise<{ error: string }>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 10_000)
      ),
    ]).catch((err) => {
      if (err.message === 'TIMEOUT') {
        return { error: 'System is currently slow. Please ask the customer to wait and try again later.' };
      }
      throw err;
    });

    if ('error' in result) {
      return NextResponse.json(result);
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[Tool: check-order-status]', error);
    return NextResponse.json({ error: 'Internal tool error' }, { status: 500 });
  }
}

async function lookupOrder(orderId: string) {
  const shopifyStore = process.env.SHOPIFY_STORE_URL;
  const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (shopifyStore && shopifyToken) {
    const baseUrl = shopifyStore.replace(/\/*$/, '');
    const response = await fetch(`${baseUrl}/admin/api/2024-01/orders/${orderId}.json`, {
      headers: {
        'X-Shopify-Access-Token': shopifyToken,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (response.status === 404) {
      return { status: 'not_found', message: `Order ${orderId} could not be found in our records.` };
    }

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    const order = data.order;
    const fulfillment = order.fulfillments?.[0];

    return {
      order_id: String(order.id),
      status: order.fulfillment_status || order.financial_status,
      carrier: fulfillment?.tracking_company ?? null,
      tracking_number: fulfillment?.tracking_number ?? null,
      estimated_delivery: fulfillment?.estimated_delivery_at ?? null,
      _source: 'shopify',
    };
  }

  await new Promise((res) => setTimeout(res, 300));

  if (orderId.includes('99999')) {
    return { status: 'not_found', message: `Order ${orderId} could not be found in our records.` };
  }

  return {
    order_id: orderId,
    status: 'shipped',
    carrier: 'FedEx',
    tracking_number: 'FX123456789',
    estimated_delivery: '2026-06-25',
    _source: 'stub',
  };
}
