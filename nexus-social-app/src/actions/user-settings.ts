'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createActionClient } from '@/lib/supabase/action';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function updateUserProfile(fullName: string) {
  const supabase = await createActionClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Unauthenticated');

  const trimmed = fullName.trim();
  const { error } = await supabase.auth.updateUser({
    data: { full_name: trimmed || null },
  });
  if (error) throw new Error(error.message);

  await supabaseAdmin
    .from('users')
    .upsert({ id: user.id, email: user.email ?? '' }, { onConflict: 'id' });

  revalidatePath('/');
  return { fullName: trimmed };
}

export async function changePassword(currentPassword: string, newPassword: string) {
  if (newPassword.length < 6) throw new Error('New password must be at least 6 characters.');

  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Unauthenticated');

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) throw new Error('Current password is incorrect.');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function setLocale(locale: string) {
  if (!['en', 'ar', 'es'].includes(locale)) throw new Error('Unsupported locale');
  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  revalidatePath('/', 'layout');
}

export async function getUserProfile() {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  return {
    email: user.email ?? '',
    fullName: (user.user_metadata?.full_name as string | undefined) ?? '',
    createdAt: user.created_at,
  };
}
