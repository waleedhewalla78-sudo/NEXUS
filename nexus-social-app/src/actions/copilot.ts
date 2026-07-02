'use server';

import { createActionClient } from '@/lib/supabase/action';
import { supabaseAdmin } from '@/lib/supabase/server';
import { runCopilotChat, type CopilotChatResult } from '@/lib/ai/copilot/copilot-service';

export async function copilotChat(input: {
  workspaceId: string;
  message: string;
  locale?: string;
  brandName?: string;
  conversationHistory?: string[];
}): Promise<CopilotChatResult> {
  const supabase = await createActionClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error('Unauthenticated');
  }

  const { data: member } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', input.workspaceId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!member) {
    throw new Error('Not a member of this workspace');
  }

  return runCopilotChat({
    workspaceId: input.workspaceId,
    userId: session.user.id,
    message: input.message,
    locale: input.locale,
    brandName: input.brandName,
    conversationHistory: input.conversationHistory,
  });
}
