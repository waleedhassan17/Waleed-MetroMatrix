// ============================================================================
// The admin console session, as stored on the device.
//
// One SecureStore key, `adminSession`, holding all four values as one JSON
// blob. Writing them under separate keys meant a refresh that died between two
// writes left a new access token next to an already-rotated refresh token — a
// session that looks valid and can never renew. One write is atomic.
//
// The admin's profile and permissions are deliberately NOT stored: they come
// from the server on every launch (GET /admin/profile), so a permission removed
// on the server is gone from the app the next time it opens.
//
// An in-memory copy saves a Keychain round-trip on every request.
// ============================================================================

import { secureGetItem, secureRemoveItem, secureSetItem } from '../../utils/storage_utils/secureStorage';

export interface AdminTokens {
  accessToken: string;
  refreshToken: string;
  /** ISO time the access token stops working (from the server). */
  accessTokenExpiresAt: string;
  sessionId: string;
}

export const ADMIN_SESSION_KEY = 'adminSession';

// Written by builds before the session rework. Those tokens carry no session
// id, so the server rejects them — they are deleted, never migrated.
const LEGACY_KEYS = ['adminToken', 'adminRefreshToken', 'adminInfo'];

let cache: AdminTokens | null | undefined;

const isNonEmpty = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** Pull the token fields out of a sign-in / refresh response body (`data`). */
export function tokensFrom(data: unknown): AdminTokens | null {
  const d = data as Partial<AdminTokens> | null | undefined;
  if (!d || !isNonEmpty(d.accessToken) || !isNonEmpty(d.refreshToken)) return null;
  return {
    accessToken: d.accessToken,
    refreshToken: d.refreshToken,
    accessTokenExpiresAt: isNonEmpty(d.accessTokenExpiresAt) ? d.accessTokenExpiresAt : new Date(0).toISOString(),
    sessionId: isNonEmpty(d.sessionId) ? d.sessionId : '',
  };
}

export async function loadAdminSession(): Promise<AdminTokens | null> {
  if (cache !== undefined) return cache;
  try {
    const raw = await secureGetItem(ADMIN_SESSION_KEY);
    cache = raw ? tokensFrom(JSON.parse(raw)) : null;
  } catch {
    cache = null;
  }
  if (!cache) await Promise.all(LEGACY_KEYS.map((k) => secureRemoveItem(k).catch(() => undefined)));
  return cache;
}

export async function saveAdminSession(tokens: AdminTokens): Promise<void> {
  cache = tokens;
  await secureSetItem(ADMIN_SESSION_KEY, JSON.stringify(tokens));
}

export async function clearAdminSession(): Promise<void> {
  cache = null;
  await Promise.all([ADMIN_SESSION_KEY, ...LEGACY_KEYS].map((k) => secureRemoveItem(k).catch(() => undefined)));
}

/** Milliseconds until the access token expires (negative when already expired). */
export const msUntilExpiry = (tokens: Pick<AdminTokens, 'accessTokenExpiresAt'>, now = Date.now()): number =>
  new Date(tokens.accessTokenExpiresAt).getTime() - now;

/** Test hook: forget the in-memory copy. */
export const __resetAdminSessionCache = (): void => {
  cache = undefined;
};
