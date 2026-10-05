// ============================================================================
// How queue work looks wherever it is listed (Overview, Queue): an icon per
// kind of work, and how urgent its wait is. Pure, so it is tested.
// ============================================================================

import type { Tone } from '../../../constants/theme';

const ICONS: Record<string, string> = {
  provider_approval: 'person-add-outline',
  doctor_approval: 'medkit-outline',
  brand_approval: 'storefront-outline',
  dispute: 'chatbox-ellipses-outline',
  payout_request: 'cash-outline',
  return_request: 'return-down-back-outline',
  wallet_adjustment: 'wallet-outline',
  reconciliation_drift: 'alert-circle-outline',
};

export const queueIcon = (type: string): string => ICONS[type] ?? 'file-tray-full-outline';

const HOUR_MS = 3_600_000;
/** Waiting longer than this reads as a warning… */
export const WARN_AFTER_HOURS = 24;
/** …and longer than this as overdue. */
export const OVERDUE_AFTER_HOURS = 72;

/** 'warning' after a day, 'error' after three, otherwise null. */
export function waitTone(since: string | null | undefined, now = Date.now()): 'warning' | 'error' | null {
  if (!since) return null;
  const hours = (now - new Date(since).getTime()) / HOUR_MS;
  if (!Number.isFinite(hours)) return null;
  if (hours >= OVERDUE_AFTER_HOURS) return 'error';
  if (hours >= WARN_AFTER_HOURS) return 'warning';
  return null;
}

export const waitBadgeTone = (since: string | null | undefined, now = Date.now()): Tone => waitTone(since, now) ?? 'neutral';
