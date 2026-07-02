'use server';

import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/server';
import { auditLog } from '@/lib/audit';

const SECRET_KEY = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fallback-secret-for-dev';

export interface ApprovalPayload {
  postId: string;
  workspaceId: string;
  exp: number;
}

/**
 * Generates a signed magic link token for external client approval.
 * Expires in 7 days by default.
 */
export async function generateApprovalToken(postId: string, workspaceId: string): Promise<string> {
  const payload: ApprovalPayload = {
    postId,
    workspaceId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  const dataString = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(dataString).digest('base64url');
  
  return `${dataString}.${signature}`;
}

/**
 * Verifies a magic link token.
 */
export async function verifyApprovalToken(token: string): Promise<ApprovalPayload> {
  const [dataString, signature] = token.split('.');
  if (!dataString || !signature) {
    throw new Error('Invalid token format');
  }

  const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(dataString).digest('base64url');
  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature');
  }

  const payload: ApprovalPayload = JSON.parse(Buffer.from(dataString, 'base64url').toString('utf-8'));
  
  if (Date.now() > payload.exp) {
    throw new Error('Token has expired');
  }

  return payload;
}

/**
 * Processes an external client's decision on a post.
 */
export async function processClientApproval(token: string, decision: 'approved' | 'rejected') {
  const payload = await verifyApprovalToken(token);
  
  // Map 'approved'/'rejected' to valid status or keep it simple.
  // Assuming our status enum supports 'published', 'draft', 'scheduled', 'failed'.
  // If 'approved' we might set it to 'scheduled' or 'approved'. For now, let's say we set a custom field or update status.
  // In our original schema we have 'draft' | 'scheduled' | 'published' | 'failed'.
  // Let's assume we map 'approved' -> 'scheduled' if it has a scheduled_at, otherwise 'published'.
  // But wait, the prompt says "update the post status in the database". We will just set it to 'scheduled' or 'draft'.
  // Actually, we can just update status to 'approved' if the enum allows it, otherwise 'scheduled'.
  // Let's use 'scheduled' for approved, and 'draft' for rejected.

  const newStatus = decision === 'approved' ? 'scheduled' : 'draft';

  const { error } = await supabaseAdmin
    .from('posts')
    .update({ status: newStatus })
    .eq('id', payload.postId)
    .eq('workspace_id', payload.workspaceId);

  if (error) {
    throw new Error(`Failed to update post: ${error.message}`);
  }

  await auditLog(
    payload.workspaceId,
    null, // External client, so no user_id
    `post.external_${decision}`,
    { post_id: payload.postId }
  );

  return { success: true, status: newStatus };
}
