import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Inserts an immutable record into the audit_logs table.
 * 
 * @param workspaceId - The UUID of the workspace where the action occurred.
 * @param userId - The UUID of the user performing the action (or 'system' if automated).
 * @param action - A dot-notated string describing the event (e.g., 'post.created', 'user.invited').
 * @param metadata - An optional JSON object containing additional context.
 */
export async function auditLog(
  workspaceId: string,
  userId: string | null,
  action: string,
  metadata: Record<string, any> = {}
) {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      workspace_id: workspaceId,
      actor_id: userId,
      action,
      metadata,
    });

    if (error) {
      console.error(`[Audit Log Error] Failed to log action '${action}':`, error.message);
      // We log to console but typically don't throw, so we don't break the main user flow 
      // just because the audit log failed (though strict compliance might require throwing).
    }
  } catch (err) {
    console.error(`[Audit Log Error] Exception during logging action '${action}':`, err);
  }
}
