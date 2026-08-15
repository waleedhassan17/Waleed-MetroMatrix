// ============================================
// Healthcare — Appointment invoice helpers
// ============================================

// expo-file-system 19 replaced the top-level API with Paths/File/Directory and
// moved `documentDirectory` + `downloadAsync` to this legacy entry point. The
// legacy path is the documented migration target and is what supports passing
// request headers, which this authenticated download needs.
import * as FileSystem from 'expo-file-system/legacy';
import { API_URL } from '../../networks/network/network';
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
 * Downloads the appointment invoice PDF to the app's document directory.
 *
 * The endpoint is auth-guarded and `protect` only reads `Authorization:
 * Bearer`, so this cannot be a plain `Linking.openURL` — a browser has no
 * token and would receive a 401. Returns the local file URI.
 */
export async function downloadInvoicePdf(
  appointmentId: string,
  token: string
): Promise<string> {
  const url = `${API_URL}/v1/healthcare/appointments/${encodeURIComponent(
    appointmentId
  )}/invoice`;

  const target = `${FileSystem.documentDirectory}${invoiceNumberFor(
    appointmentId
  )}.pdf`;

  const result = await FileSystem.downloadAsync(url, target, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status !== 200) {
    throw new Error(
      result.status === 401 || result.status === 403
        ? 'You are not authorised to download this invoice.'
        : 'The invoice could not be generated.'
    );
  }

  return result.uri;
}
