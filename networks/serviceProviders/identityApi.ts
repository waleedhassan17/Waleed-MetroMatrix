// ============================================================================
// Doorstep identity check (backend: homeservice/controllers/identityController).
// The provider reads out a 6-digit code; the customer types it in.
// ============================================================================

import { apiRequest } from './config';

/** `nfc` / `qr` only appear on checks made before those methods were removed. */
export type IdentityMethod = 'nfc' | 'qr' | 'code';

export interface IdentityToken {
  code: string;
  expiresAt: string;
  ttlSeconds: number;
}

export type IdentityTokenResponse =
  | IdentityToken
  | { alreadyVerified: true; verifiedAt: string; method: IdentityMethod };

export interface IdentityVerification {
  verified: true;
  already?: boolean;
  method: IdentityMethod;
  verifiedAt: string;
  status: string;
}

/** Provider: a fresh 10-minute, single-use code for this job. */
export const issueIdentityToken = (jobId: string) =>
  apiRequest<IdentityTokenResponse>(`/provider/jobs/${encodeURIComponent(jobId)}/identity-token`, {
    method: 'POST',
    body: '{}',
  });

/** Customer: the 6-digit code the provider read out. */
export const verifyProviderIdentity = (bookingId: string, proof: { code: string }) =>
  apiRequest<IdentityVerification>(`/bookings/${encodeURIComponent(bookingId)}/verify-identity`, {
    method: 'POST',
    body: JSON.stringify(proof),
  });

/** Provider: has the customer verified me yet? (job detail carries `identity`). */
export async function fetchJobIdentity(jobId: string): Promise<{ verifiedAt: string; method: string } | null> {
  const res = await apiRequest<any>(`/provider/jobs/${encodeURIComponent(jobId)}`, { bestEffort: true });
  return res.success ? res.data?.identity ?? null : null;
}
