'use server';

import { supabaseAdmin } from '@/lib/supabase/server';

export async function completeOnboarding(userId: string) {
  if (!userId) return;

  const { error } = await supabaseAdmin
    .from('users')
    .update({ has_completed_onboarding: true })
    .eq('id', userId);

  if (error) {
    console.error('Failed to complete onboarding for user:', error.message);
  }
}
