import { NextResponse } from 'next/server';
import { runAIEvaluationJob } from '@/jobs/ai-evaluation';

/**
 * Pre-Week 5: Orphaned Cron Job Fix
 * Secure endpoint intended to be triggered daily by Vercel Cron.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Secure endpoint against public execution
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized CRON execution' }, { status: 401 });
    }

    // Trigger the background pipeline (do not await if it takes > 60s, but Next.js edge functions 
    // or Vercel Cron limits usually allow up to 15s or require async background jobs. 
    // For this architecture, we trigger it asynchronously).
    
    // Fire and forget
    runAIEvaluationJob().catch(err => console.error('[CRON AI Eval] Background job failed:', err));

    return NextResponse.json({ status: 'success', message: 'AI Evaluation Pipeline triggered' }, { status: 200 });
  } catch (error: any) {
    console.error('[CRON AI Eval] Endpoint error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
