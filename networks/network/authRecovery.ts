// ============================================================================
// Token attachment and refresh-on-401, shared by every axios instance.
//
// Pure wiring: it knows nothing about storage or endpoints. The instance
// owner passes in how to find a token, how to refresh, and what to do when a
// session cannot be recovered (networks/network/network.ts and
// networks/shopping/shoppingAxios.ts). That is what lets the same logic cover
// the main API, the shopping API and the admin console, and what makes it
// testable without a device.
//
// Two audiences refresh independently:
//   'admin'   — the admin console session (POST /admin/auth/refresh-token)
//   'account' — the signed-in user or provider (POST /auth/refresh)
// A failed admin refresh must never sign the user out, and the reverse.
// ============================================================================

import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { Audience } from './tokenSelection';
import type { SessionAudience } from './authEvents';

/**
 * The account type a main-API path is guarded for, or null when it serves all
 * three (auth/logout, wallet/*, bookings/*, healthcare/*) — those fall back to
 * whoever is signed in.
 */
export const audienceForUrl = (url?: string): Audience | null => {
  const path = (url || '').replace(/^[a-z]+:\/\/[^/]+/i, '').replace(/^\/+/, '').replace(/^api\//, '');
  if (/^(v1\/|shopping\/)?admin(\/|$|\?)/.test(path)) return 'admin';
  if (path.startsWith('providers/') || path.startsWith('provider/')) return 'provider';
  if (path.startsWith('users/') || path === 'users') return 'user';
  return null;
};

export type RefreshOutcome =
  | { token: string }
  /** `transient`: the server was not reached — keep the session, fail this request. */
  | { token: null; transient: boolean };

/**
 * Run `task(key)` at most once at a time per key; concurrent callers share the
 * same promise.
 *
 * Refresh tokens ROTATE, and the admin API treats a replayed refresh token as
 * theft and revokes the session. Five parallel 401s refreshing five times would
 * have four of them presenting an already-rotated token — so the first one
 * refreshes and the rest wait on it.
 */
export function createSingleFlight<K, R>(task: (key: K) => Promise<R>): (key: K) => Promise<R> {
  const inflight = new Map<K, Promise<R>>();
  return (key: K) => {
    let pending = inflight.get(key);
    if (!pending) {
      pending = task(key).finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }
    return pending;
  };
}

export interface AuthRecoveryOptions {
  /** Endpoints that must never carry a token (sign-in, sign-up, verification). */
  isPublic: (url?: string) => boolean;
  /** The token to attach to `url`, and which session it belongs to. */
  tokenFor: (url?: string) => Promise<{ token: string | null; audience: SessionAudience }>;
  /** The access token currently stored for `audience`. */
  currentToken: (audience: SessionAudience) => Promise<string | null>;
  /** Renew `audience`'s session. Must be single-flight (see createSingleFlight). */
  refresh: (audience: SessionAudience) => Promise<RefreshOutcome>;
  /** The session is gone for good: clear it and tell the UI. */
  onSessionLost: (audience: SessionAudience) => Promise<void> | void;
}

type RecoverableConfig = InternalAxiosRequestConfig & {
  __sentAuth?: boolean;
  __sentToken?: string;
  __authAudience?: SessionAudience;
  __retriedAfterRefresh?: boolean;
  /** The replay carried the token found in storage, not one this request renewed. */
  __replayedWithStored?: boolean;
};

/** True when the response interceptor will try to recover this 401 (for quieter logging). */
export const willRecover = (error: AxiosError, isPublic: (url?: string) => boolean): boolean => {
  const cfg = error.config as RecoverableConfig | undefined;
  return (
    !!cfg &&
    error.response?.status === 401 &&
    !!cfg.__sentAuth &&
    (!cfg.__retriedAfterRefresh || !!cfg.__replayedWithStored) &&
    !isPublic(cfg.url)
  );
};

export function attachAuthRecovery(instance: AxiosInstance, options: AuthRecoveryOptions): void {
  instance.interceptors.request.use(async (config: RecoverableConfig) => {
    if (options.isPublic(config.url)) {
      delete config.headers.Authorization;
      return config;
    }
    // A request replayed after a refresh already carries the new token.
    if (config.headers.Authorization) return config;
    try {
      const { token, audience } = await options.tokenFor(config.url);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        config.__sentAuth = true;
        config.__sentToken = token;
        config.__authAudience = audience;
      }
    } catch {
      // Proceed unauthenticated; a protected endpoint answers 401.
    }
    return config;
  });

  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const cfg = error.config as RecoverableConfig | undefined;
    // Only a 401 on a request we actually authenticated says anything about
    // our session. When no token was sent, the stored session (if any) belongs
    // to another audience and must survive.
    if (!cfg || error.response?.status !== 401 || !cfg.__sentAuth || options.isPublic(cfg.url)) {
      throw error;
    }
    const audience = cfg.__authAudience ?? 'account';

    const renewAndReplay = async () => {
      const outcome = await options.refresh(audience);
      if (outcome.token === null) {
        if (!outcome.transient) await options.onSessionLost(audience);
        throw error;
      }
      cfg.headers.Authorization = `Bearer ${outcome.token}`;
      cfg.__sentToken = outcome.token;
      return instance(cfg);
    };

    if (cfg.__retriedAfterRefresh) {
      // A replay with the STORED token proves nothing about the session: that
      // token may simply have expired since it was stored (a provider's second
      // copy goes stale this way). Renew once before giving up.
      if (cfg.__replayedWithStored) {
        cfg.__replayedWithStored = false;
        return renewAndReplay();
      }
      // The fresh token was rejected too: the session cannot be recovered.
      await options.onSessionLost(audience);
      throw error;
    }
    cfg.__retriedAfterRefresh = true;

    // Another request may have renewed the session while this one was in
    // flight; use that token instead of rotating again.
    const current = await options.currentToken(audience);
    if (current && current !== cfg.__sentToken) {
      cfg.__replayedWithStored = true;
      cfg.headers.Authorization = `Bearer ${current}`;
      cfg.__sentToken = current;
      return instance(cfg);
    }
    return renewAndReplay();
  });
}
