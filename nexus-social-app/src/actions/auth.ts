'use server';

import { redirect } from 'next/navigation';
import { createActionClient } from '@/lib/supabase/action';

export type AuthActionState = {
  error?: string;
  message?: string;
};

function formatAuthError(message: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (message === 'fetch failed' || supabaseUrl.includes('placeholder')) {
    return 'Cannot reach Supabase. Restart the dev server and confirm NEXT_PUBLIC_SUPABASE_URL in .env.local.';
  }
  return message;
}

export async function signInWithEmail(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirect') ?? '/');

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createActionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: formatAuthError(error.message) };
  }

  redirect(redirectTo.startsWith('/') ? redirectTo : '/');
}

export async function signUpWithEmail(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }

  const supabase = await createActionClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: formatAuthError(error.message) };
  }

  return {
    message: 'Account created. Check your email to confirm, or sign in if confirmation is disabled.',
  };
}

export async function signOut() {
  const supabase = await createActionClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function requestPasswordReset(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim();

  if (!email) {
    return { error: 'Email is required.' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005';
  const supabase = await createActionClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/login?reset=1`,
  });

  if (error) {
    return { error: formatAuthError(error.message) };
  }

  return {
    message: 'If an account exists for that email, a password reset link has been sent.',
  };
}
