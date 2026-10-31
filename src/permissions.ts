import type { Account } from './api/auth';
import type { Screen } from './types';

export function canEditSetup(account: Account | null): boolean {
  return account?.status === 'approved' && account.role === 'admin';
}

export function landingScreen(account: Account): Screen {
  if (account.status !== 'approved') return 'auth';
  return requiresSetup(account) ? nextSetupStep(account) : 5;
}

export function requiresSetup(account: Account | null): boolean {
  return canEditSetup(account) && account?.setupCompleted !== true;
}

export function nextSetupStep(account: Account): 1 | 2 | 3 | 4 {
  const progress = account.setupStep ?? 0;
  return progress < 2 ? 1 : progress === 2 ? 3 : 4;
}

export function canNavigateTo(account: Account | null, screen: Screen): boolean {
  if (!requiresSetup(account) || !account) return true;
  return typeof screen === 'number' && screen >= 1 && screen <= nextSetupStep(account);
}
