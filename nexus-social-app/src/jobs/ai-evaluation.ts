import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Task 2: LLM-as-a-Judge Background Pipeline
 * Runs daily (via cron/Inngest) to sample 5% of conversations and score them.
 */
export async function runAIEvaluationJob() {
  console.log('[AI Evaluation] Starting daily LLM-as-a-Judge pipeline...');
  
  // Calculate yesterday's date range
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const startOfDay = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

  // 1. Fetch total logs per workspace for yesterday
  const { data: workspaceStats, error: statError } = await supabaseAdmin
    .from('ai_conversation_logs')
    .select('workspace_id', { count: 'exact' })
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay);

  if (statError) {
    console.error('[AI Evaluation] Failed to fetch workspace stats:', statError);
    return;
  }

  // Aggregate counts per workspace
  const workspaceCounts = workspaceStats.reduce((acc: any, log: any) => {
    acc[log.workspace_id] = (acc[log.workspace_id] || 0) + 1;
    return acc;
  }, {});

  for (const [workspaceId, count] of Object.entries(workspaceCounts)) {
    // Edge Case 2: Minimum Threshold to save costs
    if ((count as number) < 20) {
      console.log(`[AI Evaluation] Skipping workspace ${workspaceId} - Only ${count} logs (Threshold: 20)`);
      continue;
    }

    // Calculate 5% sample size
    const sampleSize = Math.max(1, Math.ceil((count as number) * 0.05));
    console.log(`[AI Evaluation] Workspace ${workspaceId}: Sampling ${sampleSize} out of ${count} logs`);

    // Fetch the raw logs. Note: In PostgreSQL, we can use ORDER BY random() for sampling
    const { data: sampledLogs, error: logError } = await supabaseAdmin
      .from('ai_conversation_logs')
      .select('id, user_query, ai_response')
      .eq('workspace_id', workspaceId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .limit(sampleSize);

    if (logError || !sampledLogs) continue;

    for (const log of sampledLogs) {
      await evaluateLog(workspaceId, log.id, log.user_query, log.ai_response);
    }
  }

  console.log('[AI Evaluation] Pipeline complete.');
}

async function evaluateLog(workspaceId: string, logId: string, userQuery: string, aiResponse: string) {
  const systemPrompt = `You are an expert QA evaluator for a customer service AI. 
Evaluate the following AI response based on the user's query.
Score Accuracy (1-5): Did it answer the question correctly based on facts?
Score Tone (1-5): Is it empathetic, professional, and concise?
Hallucination (true/false): Did it invent facts, URLs, or policies not present in the context?
Reasoning: A brief 1-sentence explanation.

Output STRICTLY in this JSON format:
{
  "accuracy": <number>,
  "tone": <number>,
  "hallucination": <boolean>,
  "reasoning": "<string>"
}`;

  const userContent = `User Query: "${userQuery}"\n\nAI Response: "${aiResponse}"`;

  try {
    // Use an external lightweight LLM API (e.g. OpenAI GPT-4o-mini)
    // Replace with actual Dify workflow or direct API as configured
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) return;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.1
      })
    });

    if (!res.ok) throw new Error(`LLM API Error: ${await res.text()}`);

    const data = await res.json();
    const rawOutput = data.choices[0].message.content;

    // Edge Case 1: Robust JSON Parsing
    const parsedData = extractAndParseJSON(rawOutput);

    if (!parsedData || !parsedData.accuracy || !parsedData.tone) {
      throw new Error('Invalid JSON structure returned by Judge LLM.');
    }

    // Insert into ai_evaluations
    await supabaseAdmin.from('ai_evaluations').insert({
      workspace_id: workspaceId,
      log_id: logId,
      accuracy_score: parsedData.accuracy,
      tone_score: parsedData.tone,
      hallucination_flag: parsedData.hallucination,
      judge_reasoning: parsedData.reasoning
    });

    console.log(`[AI Evaluation] Successfully evaluated log ${logId}`);

  } catch (error) {
    console.error(`[AI Evaluation] Failed to evaluate log ${logId}:`, error);
    // Gracefully skip on failure without crashing the whole job
  }
}

/**
 * Robustly extracts JSON from LLM outputs that might include markdown backticks.
 */
function extractAndParseJSON(rawText: string) {
  try {
    // Strip markdown JSON wrapping if present
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : rawText;
    return JSON.parse(jsonString.trim());
  } catch (e) {
    return null;
  }
}
