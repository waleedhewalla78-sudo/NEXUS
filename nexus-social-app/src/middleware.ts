import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { handleCors } from '@/lib/cors';

const rateLimitMap = new Map<string, { count: number; start: number }>();

const PUBLIC_PATH_PREFIXES = ['/login', '/setup', '/approve/', '/p/', '/_custom/'];

function isPublicPath(pathname: string): boolean {
  if (pathname === '/enterprise' || pathname === '/enterprise/') {
    return true;
  }
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export const config = {
  matcher: [
    '/((?!api/|_next/|_static/|favicon.ico).*)',
  ],
};

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  const corsResponse = handleCors(req);
  if (req.method === 'OPTIONS') {
    return corsResponse;
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (record) {
    if (now - record.start < 60_000) {
      if (record.count >= 100) {
        return new NextResponse('Too Many Requests', { status: 429 });
      }
      record.count += 1;
    } else {
      rateLimitMap.set(ip, { count: 1, start: now });
    }
  } else {
    rateLimitMap.set(ip, { count: 1, start: now });
  }

  let hostname = req.headers.get('host') || '';
  hostname = hostname.replace(/^localhost:\d+$/, 'nexussocial.local');
  hostname = hostname.replace(/^127\.0\.0\.1:\d+$/, 'nexussocial.local');

  const isMainDomain =
    hostname === 'nexussocial.local' ||
    hostname === 'app.nexussocial.com' ||
    hostname.endsWith('.vercel.app');

  if (!isMainDomain) {
    const rewriteResponse = NextResponse.rewrite(new URL(`/_custom/${hostname}${url.pathname}`, req.url));
    corsResponse.headers.forEach((value, key) => {
      rewriteResponse.headers.set(key, value);
    });
    return rewriteResponse;
  }

  let response = NextResponse.next({
    request: { headers: req.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!isPublicPath(pathname)) {
    if (!user) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : '';
  const connectSrc = ["'self'", supabaseOrigin, 'https://*.supabase.co'].filter(Boolean).join(' ');
  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src ${connectSrc}; img-src 'self' data: blob:; object-src 'none';`,
  );
  response.headers.set('Referrer-Policy', 'no-referrer-when-downgrade');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  corsResponse.headers.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}
