'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { createActionClient } from '@/lib/supabase/action';
/* eslint-disable no-secrets/no-secrets */
/**
 * Server Action: securely upload a media file to the `media-assets` bucket.
 * The function receives a `FormData` object containing a File under the key `file`.
 * It:
 *   1️⃣ Retrieves the current session (user) via the server‑side Supabase client.
 *   2️⃣ Verifies the user belongs to a workspace (via `workspace_members`).
 *   3️⃣ Uploads the file to `media-assets/<workspaceId>/<uniqueId>_<originalName>`.
 *   4️⃣ Stores the `workspace_id` in the object's metadata for RLS.
 *   5️⃣ Returns the public (signed) URL that can be used in the UI.
 */
export async function uploadMedia(formData: FormData): Promise<string> {
  // 1️⃣ Get user session (server‑side, no client exposure)
  const supabase = await createActionClient();
  const { data: { session }, error: sessErr } = await supabase.auth.getSession();
  if (sessErr || !session) {
    throw new Error('Unauthenticated');
  }
  const userId = session.user.id;

  // 2️⃣ Determine workspace – we expect the caller to provide a workspaceId.
  //    It could also be inferred from a hidden form field.
  const workspaceId = formData.get('workspace_id') as string | null;
  if (!workspaceId) {
    throw new Error('workspace_id missing');
  }

  // Verify membership via the workspace_members table (server‑side admin client)
  const { data: member, error: memErr } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .single();
  if (memErr || !member) {
    throw new Error('User not a member of the workspace');
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    throw new Error('No file provided');
  }

  // Generate a unique path: <workspaceId>/<timestamp>_<originalName>
  const timestamp = Date.now();
  const path = `${workspaceId}/${timestamp}_${file.name}`;

  // Convert File to ArrayBuffer for Supabase upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 3️⃣ Upload with metadata (workspace_id) so RLS can check it.
  const { error: uploadErr } = await supabaseAdmin.storage
    .from('media-assets')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
      // Store workspace_id in the object's custom metadata (JSON string)
      // Supabase storage `metadata` accepts string values.
      // We'll store as simple string.
      // Note: the RLS policies reference metadata->>'workspace_id'.
      metadata: { workspace_id: workspaceId },
    });

  if (uploadErr) {
    console.error('Upload error:', uploadErr);
    throw new Error('Failed to upload media');
  }

  // 4️⃣ Generate a signed URL (valid for 7 days) for client consumption.
  const { data, error: urlErr } = await supabaseAdmin.storage
    .from('media-assets')
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (urlErr || !data) {
    console.error('Signed URL error:', urlErr);
    throw new Error('Failed to generate signed URL');
  }

  // Return the signed URL string
  return data.signedUrl;
}
