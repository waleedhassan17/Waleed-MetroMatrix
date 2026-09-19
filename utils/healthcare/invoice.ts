// ============================================
// Healthcare — Appointment invoice helpers
// ============================================

import { downloadAndShareAuthedPdf } from './documents';
import { getAccessToken } from '../storage_utils/storageUtils';

export { getAccessToken };

/** Stable, human-readable invoice number derived from the appointment id. */
export function invoiceNumberFor(appointmentId?: string | null): string {
  const id = (appointmentId || '').trim();
  if (!id) return 'INV-—';
  return `INV-${id.slice(-8).toUpperCase()}`;
}

export function paymentMethodLabel(method?: string | null): string {
  switch (method) {
    case 'wallet':
      return 'MetroMatrix Wallet';
    case 'cash_at_clinic':
      return 'Cash at clinic';
    default:
      return 'Not paid';
  }
}

/**
 * Download the appointment invoice PDF and open the save/share sheet on it.
 *
 * The endpoint is auth-guarded and `protect` only reads `Authorization:
 * Bearer`, so this cannot be a plain `Linking.openURL` — a browser has no token
 * and would receive a 401. The sheet is what makes this a download: it is where
 * "Save to Files" / "Save to Drive" live.
 *
 * This used to return the local URI for the caller to pass to
 * `Share.share({ url })`, which Android ignores — the user got the `message`
 * string pasted into whichever app they picked, and no file at all.
 */
export async function downloadInvoicePdf(appointmentId: string): Promise<void> {
  const number = invoiceNumberFor(appointmentId);
  await downloadAndShareAuthedPdf(
    `/v1/healthcare/appointments/${encodeURIComponent(appointmentId)}/invoice`,
    `${number}.pdf`,
    `Save or share invoice ${number}`
  );
}
