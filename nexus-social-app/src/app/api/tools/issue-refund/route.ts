import { NextResponse } from 'next/server';
import { z } from 'zod';

const RefundSchema = z.object({
  order_id: z.string().min(1),
  amount: z.number().positive()
});

/**
 * Task 1: Secure Internal Tool Proxy (Issue Refund)
 * WRITE Action: Requires Human-in-the-Loop (HITL) approval.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const secret = process.env.INTERNAL_TOOL_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized tool access' }, { status: 401 });
    }

    const payload = await req.json();
    const parsed = RefundSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters', details: parsed.error }, { status: 400 });
    }

    const { order_id, amount } = parsed.data;

    // SCADA Context 4: "Write" actions MUST be paused and sent to a human agent for approval.
    // Instead of executing the Stripe/Shopify refund API, we return a pending status.
    
    // The orchestration job will intercept this specific status and trigger the Magic Link approval flow.
    return NextResponse.json({ 
      status: 'pending_approval', 
      message: `A refund of $${amount} for order ${order_id} has been drafted and is pending human approval. Inform the user that a specialist will confirm this shortly.`,
      draft_details: {
        order_id,
        amount,
        action: 'issue_refund'
      }
    });

  } catch (error: any) {
    console.error('[Tool: issue-refund]', error);
    return NextResponse.json({ error: 'Internal tool error' }, { status: 500 });
  }
}
