import { NextResponse } from 'next/server';
import { checkDifyVerifyStatus } from '@/lib/ai/verify-status';

export async function GET() {
  const result = await checkDifyVerifyStatus();
  return NextResponse.json(result);
}
