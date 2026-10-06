// ============================================================================
// Session refresh for both audiences, single-flight per audience.
//
//   'account' → POST /auth/refresh              { refreshToken } → { accessToken, refreshToken }
//   'admin'   → POST /admin/auth/refresh-token  { refreshToken } → { data: { accessToken, refreshToken,
//                                                                    accessTokenExpiresAt, sessionId,
//                                                                    restrict, admin } }
//
// `post` is injected (a bare axios call in production — going through the
// instance would re-enter its interceptors and recurse on a 401 from the
// refresh itself), which also lets the tests drive it directly.
//
// A refresh that never reached the server (offline, timeout, 5xx, 429) is
// TRANSIENT: the session is kept and only the triggering request fails. Wiping
// a session because the phone lost signal in a lift is how people get signed
// out for no reason.
// ============================================================================

import { createSingleFlight, type RefreshOutcome } from './authRecovery';
import { emitAdminSessionRefreshed, type SessionAudience } from './authEvents';
import { isValidToken } from './tokenSelection';
import { loadAdminSession, saveAdminSession, tokensFrom } from '../admin/session';
import { getRefreshToken, saveAuthTokens, syncProviderAccessToken } from '../../utils/storage_utils/storageUtils';
import { devWarn } from '../../utils/devLog';

export type RefreshPost = (path: string, body: unknown) => Promise<{ data: any }>;

export interface SessionRefreshHooks {
  /** A new user/provider access token was stored (the realtime socket re-handshakes with it). */
  onAccountToken?: (token: string) => void;
}

const isTransient = (err: any): boolean => {
  const status = err?.response?.status;
  return !status || status >= 500 || status === 429;
};

export function createSessionRefresher(post: RefreshPost, hooks: SessionRefreshHooks = {}) {
  const refreshAccount = async (): Promise<RefreshOutcome> => {
    const refreshToken = await getRefreshToken();
    if (!isValidToken(refreshToken)) return { token: null, transient: false };
    try {
      const { data } = await post('auth/refresh', { refreshToken });
      if (!isValidToken(data?.accessToken)) return { token: null, transient: false };
      await saveAuthTokens(data.accessToken, data.refreshToken);
      // A provider holds a second copy that provider requests send first.
      await syncProviderAccessToken(data.accessToken);
      hooks.onAccountToken?.(data.accessToken);
      return { token: data.accessToken };
    } catch (err: any) {
      devWarn('Session refresh failed:', err?.response?.status ?? err?.code ?? 'network');
      return { token: null, transient: isTransient(err) };
    }
  };

  const refreshAdmin = async (): Promise<RefreshOutcome> => {
    const session = await loadAdminSession();
    if (!session) return { token: null, transient: false };
    try {
      const { data } = await post('admin/auth/refresh-token', { refreshToken: session.refreshToken });
      const tokens = tokensFrom(data?.data);
      if (!tokens) return { token: null, transient: false };
      await saveAdminSession(tokens);
      emitAdminSessionRefreshed({ admin: data.data.admin, restrict: data.data.restrict ?? null });
      return { token: tokens.accessToken };
    } catch (err: any) {
      devWarn('Admin session refresh failed:', err?.response?.status ?? err?.code ?? 'network');
      return { token: null, transient: isTransient(err) };
    }
  };

  return createSingleFlight((audience: SessionAudience) => (audience === 'admin' ? refreshAdmin() : refreshAccount()));
}
