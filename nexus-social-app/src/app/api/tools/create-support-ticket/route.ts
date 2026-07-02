import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const TicketSchema = z.object({
  workspace_id: z.string().uuid(),
  subject: z.string().min(5),
  description: z.string().min(10),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  external_conversation_id: z.string().optional()
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Task 1: Secure Internal Tool Proxy (Create Support Ticket)
 * WRITE Action: Creates a ticket in the database.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const secret = process.env.INTERNAL_TOOL_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized tool access' }, { status: 401 });
    }

    const payload = await req.json();
    const parsed = TicketSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters', details: parsed.error }, { status: 400 });
    }

    const data = parsed.data;

    const { data: ticket, error } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        workspace_id: data.workspace_id,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        external_conversation_id: data.external_conversation_id
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ status: 'error', message: 'Failed to create ticket in DB.' });
    }

    return NextResponse.json({ 
      status: 'success', 
      message: `Support ticket created successfully. Ticket ID: ${ticket.id}` 
    });

  } catch (error: any) {
    console.error('[Tool: create-support-ticket]', error);
    return NextResponse.json({ error: 'Internal tool error' }, { status: 500 });
  }
}
