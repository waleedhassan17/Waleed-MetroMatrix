// ============================================================================
// What the admin auth screens say when something fails. Pure, so it is tested.
// Branches on the server's error code — never on its message text.
// ============================================================================

import type { AdminApiError } from '../../../networks/admin/errors';

/** "in 1 minute" / "in 15 minutes" / "in 45 seconds". */
export function formatWait(seconds: number | null | undefined): string {
  const n = Number(seconds);
  const s = Number.isFinite(n) ? Math.max(1, Math.round(n)) : 1;
  if (s < 60) return `in ${s} second${s === 1 ? '' : 's'}`;
  const m = Math.ceil(s / 60);
  return `in ${m} minute${m === 1 ? '' : 's'}`;
}

const retryAfterOf = (error: AdminApiError): number | null => {
  const v = (error.details as { retryAfterSeconds?: unknown } | undefined)?.retryAfterSeconds;
  return typeof v === 'number' ? v : null;
};

export function signInErrorMessage(error: AdminApiError): string {
  switch (error.code) {
    case 'TOO_MANY_ATTEMPTS': {
      const wait = retryAfterOf(error);
      return wait
        ? `Too many failed attempts. Try again ${formatWait(wait)}.`
        : 'Too many failed attempts. Try again later.';
    }
    case 'INVALID_CREDENTIALS':
      return 'That email and password do not match an admin account.';
    case 'ACCOUNT_DEACTIVATED':
      return 'This admin account has been deactivated. Contact a super admin.';
    case 'TOTP_INVALID':
      return 'That code is not valid. Check your authenticator app and try again.';
    case 'TOKEN_INVALID':
      return 'This sign-in attempt has expired. Please start again.';
    case 'VALIDATION_FAILED':
      return error.fieldErrors[0]?.message || 'Check the details and try again.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return error.message;
    default:
      return error.status >= 500 ? 'Something went wrong on the server. Try again in a moment.' : error.message;
  }
}

/** The individual problems from a WEAK_PASSWORD answer, for a bullet list. */
export function passwordProblems(error: AdminApiError): string[] {
  const problems = (error.details as { problems?: unknown } | undefined)?.problems;
  return Array.isArray(problems) ? problems.filter((p): p is string => typeof p === 'string') : [];
}

export const ADMIN_PASSWORD_MIN_LENGTH = 10;

/**
 * The checks the server makes that the app can make first (length, not the
 * email name). The server stays authoritative — it also rejects common
 * passwords — and its answer is shown as-is.
 */
export function localPasswordProblems(password: string, email?: string | null): string[] {
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) return [`Use at least ${ADMIN_PASSWORD_MIN_LENGTH} characters`];
  const problems: string[] = [];
  if (/^(.)\1+$/.test(password)) problems.push('Do not repeat a single character');
  const local = (email || '').split('@')[0].toLowerCase();
  if (local.length >= 4 && password.toLowerCase().includes(local)) problems.push('Do not include your email name');
  return problems;
}
