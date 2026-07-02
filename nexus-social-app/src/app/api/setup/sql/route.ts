import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SQL_FILES = {
  bootstrap: 'essential_bootstrap.sql',
  patch: 'schema_patch.sql',
} as const;

export async function GET(request: NextRequest) {
  const fileKey = request.nextUrl.searchParams.get('file');
  const filename =
    fileKey === 'patch' ? SQL_FILES.patch : SQL_FILES.bootstrap;

  try {
    const sql = readFileSync(join(process.cwd(), 'src/sql', filename), 'utf8');
    return new NextResponse(sql, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return NextResponse.json({ error: 'SQL file not found' }, { status: 500 });
  }
}
