import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

/**
 * Creates a server-side Supabase client for Server Actions that is cookie/session aware.
 */
export async function createActionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored if called during pre-rendering or SSR
          }
        },
      },
    }
  );
}

/** RLS-authenticated Supabase client for React Server Components. */
export const createServerComponentClient = createActionClient;
