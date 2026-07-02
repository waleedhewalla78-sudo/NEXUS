// src/app/layout.tsx
import './globals.css';
import { PropsWithChildren } from 'react';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import AppShell from '@/components/AppShell';
import ThemeProvider from '@/components/ThemeProvider';
import { BrandingProvider } from '@/context/BrandingContext';
import Providers from '@/components/Providers';
import OnboardingTour from '@/components/OnboardingTour';
import { supabaseAdmin } from '@/lib/supabase/server';

export const metadata = {
  title: 'Nexus Social – Dashboard',
  description: 'All‑in‑one social media management platform',
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const messages = await getMessages();
  const locale = await getLocale();

  // Await the cookies store (Next.js 13+ async API)
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Use awaited cookieStore for Supabase SSR
      cookies: {
        getAll: () => cookieStore.getAll?.() || [],
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
        // Preferred API (uncomment if needed)
        // get: (key) => cookieStore.get(key)?.value,
        // set: (key, value, options) => cookieStore.set(key, value, options),
        // remove: (key, options) => cookieStore.delete(key, options),
      },
    }
  );
  const { data: { session } } = await supabase.auth.getSession();
  let hasCompletedOnboarding = true;

  if (session?.user) {
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('has_completed_onboarding')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!userError && userData) {
      hasCompletedOnboarding = Boolean(userData.has_completed_onboarding);
    } else if (userError?.code !== 'PGRST116') {
      // PGRST116 = no row; 42703 = missing column — default to showing onboarding once
      hasCompletedOnboarding = userError?.code === '42703' ? false : hasCompletedOnboarding;
    } else {
      hasCompletedOnboarding = false;
    }
  }

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className="font-sans" suppressHydrationWarning>
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>
            <ThemeProvider>
              <BrandingProvider>
                <AppShell>{children}</AppShell>
                {session?.user && (
                  <OnboardingTour userId={session.user.id} hasCompleted={hasCompletedOnboarding} />
                )}
              </BrandingProvider>
            </ThemeProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
