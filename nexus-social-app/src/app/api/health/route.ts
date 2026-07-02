import { NextResponse } from 'next/server';
import { checkSystemHealth } from '@/actions/health';

export const runtime = 'nodejs';

export async function GET() {
  const healthStatus = await checkSystemHealth();
  
  return NextResponse.json(
    {
      status: healthStatus.overall === 'down' ? 'error' : 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
      details: healthStatus
    },
    { status: healthStatus.overall === 'down' ? 503 : 200 }
  );
}
