'use server';

import {
  getTargetAccountByIdSync,
  listTargetAccountsSync,
} from '@/lib/ai-cmo/abm/target-account-store';
import type { TargetAccount } from '@/types/abm';

/** Resolve a single ABM target account (static mocks for NEXGEN track) */
export async function getTargetAccountById(accountId: string): Promise<TargetAccount | null> {
  if (!accountId?.trim()) return null;
  return getTargetAccountByIdSync(accountId.trim());
}

/** List all mock target accounts for brief wizard dropdown */
export async function listTargetAccounts(): Promise<TargetAccount[]> {
  return listTargetAccountsSync();
}
