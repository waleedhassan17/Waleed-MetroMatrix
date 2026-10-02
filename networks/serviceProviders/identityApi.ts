// ============================================================================
// Doorstep identity check (backend: homeservice/controllers/identityController).
// ============================================================================

import { apiRequest } from './config';

export interface IdentityToken {
  token: string;
  code: string;
  /** Written to the NFC badge. */
  nfcUri: string;
  /** Shown as the QR code. */
  qrPayload: string;
  expiresAt: string;
  ttlSeconds: number;
}

export type IdentityTokenResponse =
  | IdentityToken
  | { alreadyVerified: true; verifiedAt: string; method: 'nfc' | 'qr' | 'code' };

export interface IdentityVerification {
  verified: true;
  already?: boolean;
  method: 'nfc' | 'qr' | 'code';
  verifiedAt: string;
  status: string;
}

/** Provider: a fresh 10-minute, single-use proof for this job. */
export const issueIdentityToken = (jobId: string) =>
  apiRequest<IdentityTokenResponse>(`/provider/jobs/${encodeURIComponent(jobId)}/identity-token`, {
    method: 'POST',
    body: '{}',
  });

/** Customer: what was read from the badge / QR, or the 6-digit code. */
export const verifyProviderIdentity = (
  bookingId: string,
  proof: { token: string; method: 'nfc' | 'qr' } | { code: string }
) =>
  apiRequest<IdentityVerification>(`/bookings/${encodeURIComponent(bookingId)}/verify-identity`, {
    method: 'POST',
    body: JSON.stringify(proof),
  });

/** Provider: has the customer verified me yet? (job detail carries `identity`). */
export async function fetchJobIdentity(jobId: string): Promise<{ verifiedAt: string; method: string } | null> {
  const res = await apiRequest<any>(`/provider/jobs/${encodeURIComponent(jobId)}`, { bestEffort: true });
  return res.success ? res.data?.identity ?? null : null;
}
