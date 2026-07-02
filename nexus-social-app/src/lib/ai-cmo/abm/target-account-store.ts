import { MOCK_TARGET_ACCOUNTS } from '@/data/abm-mocks';
import type { TargetAccount } from '@/types/abm';

/** Static mock lookup — replace with Supabase in a later track */
export function getTargetAccountByIdSync(accountId: string): TargetAccount | null {
  return MOCK_TARGET_ACCOUNTS.find((a) => a.id === accountId) ?? null;
}

export function listTargetAccountsSync(): TargetAccount[] {
  return MOCK_TARGET_ACCOUNTS;
}
