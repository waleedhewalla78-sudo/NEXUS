import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/server';

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: '2026-05-27.dahlia' as never,
  });
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return new NextResponse('Webhook secret not configured', { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new NextResponse('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.client_reference_id; // Pass workspace_id when creating session
        
        if (workspaceId) {
          // Add 5000 credits for a successful checkout (example)
          const { data: ledger } = await supabaseAdmin
            .from('ai_credit_ledger')
            .select('total_credits')
            .eq('workspace_id', workspaceId)
            .single();
            
          const currentTotal = ledger ? ledger.total_credits : 0;
          await supabaseAdmin.from('ai_credit_ledger').upsert({
            workspace_id: workspaceId,
            total_credits: currentTotal + 5000,
          }, { onConflict: 'workspace_id' });
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabaseAdmin.from('subscriptions').update({
          status: subscription.status,
          current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
        }).eq('stripe_subscription_id', subscription.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if ((invoice as any).subscription) {
          await supabaseAdmin.from('subscriptions').update({
            status: 'past_due'
          }).eq('stripe_subscription_id', (invoice as any).subscription as string);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new NextResponse('Webhook processed successfully', { status: 200 });
  } catch (error: any) {
    console.error(`Error processing webhook ${event.type}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
