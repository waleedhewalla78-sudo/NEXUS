'use server';

import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redactPII } from '@/utils/pii';

/**
 * Task 4: Knowledge Base Ingestion & PII Redaction Pipeline
 */
export async function ingestDocument(workspaceId: string, fileContent: string, fileName: string) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // @ts-expect-error Next.js 15 async cookies conflict
    { cookies }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthorized');

  // Verify user belongs to workspace
  const { data: memberCheck } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', session.user.id)
    .single();

  if (!memberCheck) {
    throw new Error('Forbidden: Not a member of this workspace.');
  }

  // 1. Fetch the dataset_id from ai_agent_configs
  const { data: config } = await supabase
    .from('ai_agent_configs')
    .select('dify_dataset_id')
    .eq('workspace_id', workspaceId)
    .single();

  if (!config || !config.dify_dataset_id) {
    throw new Error('AI Agent not provisioned for this workspace.');
  }

  // 2. CRITICAL Edge Case: Redact PII before it leaves our servers!
  // The redactPII utility removes emails and phones, but leaves SKUs/Models intact.
  const redactedContent = redactPII(fileContent);

  const difyBase = process.env.DIFY_BASE_URL?.replace(/\/$/, '') ?? '';
  const difyAdminKey = process.env.DIFY_ADMIN_API_KEY ?? '';

  if (!difyBase || !difyAdminKey) {
    throw new Error('Dify admin configuration missing');
  }

  try {
    // 3. Call Dify API to ingest document
    const payload = {
      name: fileName,
      text: redactedContent,
      indexing_technique: 'high_quality',
      process_rule: {
        mode: 'automatic'
      }
    };

    const ingestRes = await fetch(`${difyBase}/v1/datasets/${config.dify_dataset_id}/document/create-by-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${difyAdminKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!ingestRes.ok) {
      throw new Error(`Dify ingestion failed: ${await ingestRes.text()}`);
    }

    const ingestData = await ingestRes.json();

    // 4. Handle Edge Case 1: Asynchronous Indexing Rate Limits
    // Dify returns a document ID immediately, but indexing takes time.
    // We return the document_batch_id so the client can poll the status endpoint,
    // preventing the Next.js serverless function from timing out on large PDFs.
    
    return {
      success: true,
      documentId: ingestData.document?.id,
      batchId: ingestData.batch_id,
      message: 'Document ingested and queued for indexing.'
    };

  } catch (error: any) {
    console.error('Document ingestion error:', error);
    throw new Error(error.message);
  }
}

/**
 * Helper to check indexing status (Polling endpoint for the frontend)
 */
export async function checkIndexingStatus(workspaceId: string, batchId: string) {
  // @ts-expect-error Next.js 15 async cookies conflict
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthorized');

  const { data: config } = await supabase.from('ai_agent_configs').select('dify_dataset_id').eq('workspace_id', workspaceId).single();
  if (!config) throw new Error('Agent not found');

  const difyBase = process.env.DIFY_BASE_URL?.replace(/\/$/, '') ?? '';
  const difyAdminKey = process.env.DIFY_ADMIN_API_KEY ?? '';

  const res = await fetch(`${difyBase}/v1/datasets/${config.dify_dataset_id}/documents/${batchId}/indexing-status`, {
    headers: { Authorization: `Bearer ${difyAdminKey}` }
  });

  if (!res.ok) throw new Error('Failed to fetch status');
  return await res.json();
}
