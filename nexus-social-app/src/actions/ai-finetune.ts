'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { createActionClient } from '@/lib/supabase/action';
import { redactPII } from '@/utils/pii';

/**
 * Trigger an OpenAI Fine-Tuning job using historical high-performing posts.
 * This function extracts published posts, redacts PII, formats them to JSONL,
 * uploads to OpenAI, and starts a fine-tuning job.
 */
export async function triggerFineTuning(workspaceId: string) {
  // 1. Authenticate user and verify workspace membership
  const supabase = await createActionClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('Unauthenticated');

  const { data: member, error: memberErr } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', session.user.id)
    .single();

  if (memberErr || !member) throw new Error('Unauthorized');

  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  // 2. Query published posts for this workspace
  const { data: posts, error: postsErr } = await supabaseAdmin
    .from('posts')
    .select('content')
    .eq('workspace_id', workspaceId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(50); // Using top 50 recent published posts for training

  if (postsErr) throw new Error('Failed to fetch posts');
  if (!posts || posts.length < 10) {
    throw new Error('Not enough published posts to fine-tune (minimum 10 required)');
  }

  // 3. Format to JSONL and Redact PII
  const systemPrompt = "You are an expert social media manager mimicking the exact brand voice and style of this workspace's historical posts. Generate a highly engaging social media caption based on the user's prompt.";
  
  let jsonlContent = '';
  for (const post of posts) {
    if (!post.content) continue;
    
    // CRITICAL: Redact PII to prevent data leaks into the model
    const redactedContent = redactPII(post.content);
    
    const messageObj = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate a social media post in our brand voice.' },
        { role: 'assistant', content: redactedContent }
      ]
    };
    jsonlContent += JSON.stringify(messageObj) + '\n';
  }

  // 4. Upload JSONL file to OpenAI
  const formData = new FormData();
  const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
  formData.append('file', blob, `finetune_workspace_${workspaceId}.jsonl`);
  formData.append('purpose', 'fine-tune');

  const fileUploadRes = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAiKey}`
    },
    body: formData
  });

  if (!fileUploadRes.ok) {
    const errorText = await fileUploadRes.text();
    console.error('OpenAI File Upload failed:', errorText);
    throw new Error('Failed to upload training data to OpenAI');
  }

  const fileData = await fileUploadRes.json();
  const fileId = fileData.id;

  // 5. Trigger Fine-Tuning Job
  const ftRes = await fetch('https://api.openai.com/v1/fine_tuning/jobs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      training_file: fileId,
      model: 'gpt-3.5-turbo-0125' // Standard model for fine tuning text
    })
  });

  if (!ftRes.ok) {
    const errorText = await ftRes.text();
    console.error('OpenAI Fine-Tuning failed:', errorText);
    throw new Error('Failed to trigger OpenAI fine-tuning job');
  }

  const ftData = await ftRes.json();

  // 6. Save job ID to workspace settings
  const { error: upsertErr } = await supabaseAdmin
    .from('workspace_ai_settings')
    .upsert({
      workspace_id: workspaceId,
      fine_tuned_model_id: ftData.id, // Store job ID until complete, could be updated via webhook or polling later
      training_status: 'training',
      last_trained_at: new Date().toISOString()
    }, { onConflict: 'workspace_id' });

  if (upsertErr) {
    console.error('Failed to save AI settings:', upsertErr);
    throw new Error('Failed to save AI settings');
  }

  return { success: true, jobId: ftData.id };
}
