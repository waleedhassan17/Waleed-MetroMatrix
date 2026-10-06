// ============================================================================
// Wallet rules the console shows before the server enforces them. Pure, so it
// is tested. The server stays the judge: these only keep the console from
// offering a door that opens onto a refusal.
// ============================================================================

import type { AdminWallet, WalletAdjustment, WalletTxn } from '../../../networks/admin/walletsApi';
import { formatMoney } from '../../../constants/Currency';

export const OWNER_TYPE_LABEL: Record<AdminWallet['ownerType'], string> = {
  User: 'Customer',
  Provider: 'Provider',
  // Holds fees collected before October 2026; nothing new reaches it.
  Platform: 'Platform account',
};

export const OWNER_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'User', label: 'Customers' },
  { value: 'Provider', label: 'Providers' },
  { value: 'Platform', label: 'Platform account' },
];

export interface Approver {
  id?: string | null;
  isSuperAdmin?: boolean | null;
}

/**
 * Whether this admin may approve or reject this adjustment — and if not, why.
 * Above the finance threshold an adjustment needs a super admin who is not
 * the one who asked for it (maker-checker).
 */
export function decisionBlock(a: Pick<WalletAdjustment, 'status' | 'requestedBy'>, me: Approver | null | undefined): string | null {
  if (a.status !== 'pending') return 'This adjustment has already been decided.';
  if (!me?.isSuperAdmin) return 'A super admin decides adjustments above the approval threshold.';
  if (a.requestedBy && me.id && a.requestedBy === me.id) return 'A different super admin has to decide on an adjustment you requested.';
  return null;
}

/** "Add PKR 2,500" / "Take PKR 2,500". */
export const adjustmentTitle = (a: Pick<WalletAdjustment, 'direction' | 'amount' | 'currency'>): string =>
  `${a.direction === 'credit' ? 'Add' : 'Take'} ${formatMoney(a.amount, { code: a.currency })}`;

/** "+PKR 2,500" / "−PKR 2,500". */
export const signedAmount = (t: Pick<WalletTxn, 'type' | 'amount' | 'currency'>): string =>
  `${t.type === 'credit' ? '+' : '−'}${formatMoney(t.amount, t.currency ? { code: t.currency } : undefined)}`;

/** A typed amount: positive, at most two decimals. Null when it is not one. */
export function parseAmount(text: string): number | null {
  const t = text.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? n : null;
}
