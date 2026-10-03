import axios from "axios";
import { Platform } from "react-native";
import {
  clearAuthData,
  KeyForStorage,
  retrieveData,
} from "../../utils/storage_utils/storageUtils";
import { devLog } from "../../utils/devLog";
import { clearAdminSession, loadAdminSession } from "../admin/session";
import { attachAuthRecovery, audienceForUrl, willRecover, type AuthRecoveryOptions } from "./authRecovery";
import { emitAdminRestricted, emitSessionEnded, type SessionAudience } from "./authEvents";
import { createSessionRefresher } from "./sessionRefresh";
import { isValidToken, tokenAudience, tokenForRequest } from "./tokenSelection";

export { audienceForUrl };

// API Configuration
// PRODUCTION (Vercel) — auth, users, providers, doctors, bookings,
// appointments, shopping, wallet, Stripe.
//
// Chat and calling are NOT served from here. Vercel is serverless and cannot
// hold a WebSocket open, so those live on the realtime service (Heroku),
// addressed via REALTIME_BASE_URL in config/env.ts.
//
// The literal is kept as a fallback so a build with no env configured behaves
// exactly as it did before.
// `EXPO_PUBLIC_API_URL=auto` (dev only) resolves the backend host from Metro's
// own bundle URL. A LAN address hardcoded in .env.local goes stale every time
// DHCP hands the machine a new IP, and the failure it produces on the phone is
// an opaque "Network request failed" — the app is simply calling an address
// that no longer exists. Metro already knows the right host, because the phone
// just downloaded the bundle from it, so let it answer rather than a human.
//
// Opt-in by design: only the literal string 'auto' triggers it, so anyone with
// a real URL configured (or nothing configured at all) is unaffected, and a
// production build never takes this path.
const packagerHost = (): string | null => {
  // expo-constants is the supported way to ask; hostUri is "192.168.1.4:8081".
  try {
    const Constants = require("expo-constants").default;
    const hostUri: string | undefined =
      Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoGo?.debuggerHost;
    const host = hostUri ? hostUri.split(":")[0] : null;
    if (host) return host;
  } catch {
    // fall through to the RN internal below
  }
  // Fallback: parse the bundle URL the app was loaded from.
  try {
    const { NativeModules } = require("react-native");
    const url: string | undefined = NativeModules?.SourceCode?.scriptURL;
    return url ? /^https?:\/\/([^/:]+)/.exec(url)?.[1] || null : null;
  } catch {
    return null;
  }
};

const resolveApiUrl = (): string => {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured && configured !== "auto") return configured;
  if (configured === "auto" && __DEV__) {
    const host = packagerHost();
    if (host) return `http://${host}:5000/api`;
    // Silently using the deployed API here would be the worst outcome: local
    // changes appear to do nothing, which is far harder to diagnose than a
    // failed request. Say so loudly instead.
    console.warn(
      "⚠️ EXPO_PUBLIC_API_URL=auto could not resolve the Metro host — " +
        "falling back to the DEPLOYED backend. Set a full URL in .env.local."
    );
  }
  return "https://metro-matrix-backend.vercel.app/api";
};

export const API_URL = resolveApiUrl();
// Local testing (web): "http://localhost:5000/api"
// LAN IP (for a physical device): "http://192.168.100.71:5000/api", or 'auto'.

// Which backend this build is actually talking to. Without it, diagnosing a
// failed request means guessing between a stale LAN IP, a missed Metro
// restart, and the deployed default — all of which look identical on screen.
if (__DEV__) {
  console.log(`🌐 API_URL in use: ${API_URL}`);
}

const TIMEOUT = 30000; // 30 seconds timeout

// Create Main API instance
const MainAxiosInstance = axios.create({
  baseURL: API_URL,
  responseType: "json",
  timeout: TIMEOUT,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

/**
 * Endpoints that must NEVER carry an Authorization header.
 */
const UNAUTHENTICATED_ENDPOINTS = [
  'auth/login',
  'auth/register',
  'auth/provider/login',
  'auth/provider/register',
  'auth/forgot-password',
  'auth/reset-password',
  'auth/verify',
  'auth/verify-email',
  'auth/verify-email-token',
  'auth/send-verification-email',
  'auth/provider/send-verification-email',
  'auth/check-verification-status',
  'auth/resend-verification',
  'auth/provider/resend-verification',
  'verify-email',
  // Social auth
  'auth/google-signup',
  'auth/google-login',
  'auth/facebook-signup',
  'auth/facebook-login',
  'provider/approval-status',
];

// Admin paths use an explicit prefix list. Substring matching against the list
// above would treat any admin path that happens to contain 'auth/login' or
// 'auth/verify' as public and send it without the admin's token.
const ADMIN_PUBLIC_ENDPOINTS = [
  'admin/auth/login', // and admin/auth/login/totp
  'admin/login',
  'admin/auth/refresh-token',
  'admin/provider-submissions', // provider-app onboarding (see BE docs/ADMIN_OPEN_ITEMS.md #12)
];

export const isPublicEndpoint = (url?: string): boolean => {
  const path = (url || '').replace(/^\/+/, '');
  if (audienceForUrl(path) === 'admin') return ADMIN_PUBLIC_ENDPOINTS.some((p) => path.startsWith(p));
  return UNAUTHENTICATED_ENDPOINTS.some((endpoint) => path.includes(endpoint));
};

// Development only, and one line. Release builds used to write five logs per
// request — one pretty-printing every header — on every screen load and poll.
MainAxiosInstance.interceptors.request.use((config) => {
  if (__DEV__ && config.url) {
    console.log(`→ ${config.method?.toUpperCase()} ${config.baseURL}/${config.url}`);
  }
  return config;
});

/**
 * Silent refresh-and-retry on 401, per audience (networks/network/authRecovery.ts).
 *
 * Access tokens are short-lived (JWT_EXPIRE defaults to 15m on the backend) so
 * a stolen one expires quickly. That only works if the app renews
 * transparently — otherwise everyone is thrown back to sign-in a quarter of an
 * hour into the session.
 *
 * The refresh is a bare axios call, not MainAxiosInstance: going through the
 * instance would re-enter these interceptors and, on a 401 from the refresh
 * itself, recurse.
 */
const refresher = createSessionRefresher(
  (path, body) =>
    axios.post(`${API_URL}/${path}`, body, {
      timeout: TIMEOUT,
      headers: { 'Content-Type': 'application/json' },
    }),
  {
    // The realtime socket only reads its token at handshake time, so a rotated
    // token leaves the live socket on the OLD one until the server expires it.
    // Re-handshake now, or chat and incoming calls silently stop while REST
    // carries on. Imported lazily: socketClient pulls in config/env, and a
    // top-level import would create a cycle back through this module.
    onAccountToken: (token) => {
      try {
        const { refreshSocketAuth } = require('../../services/socket/socketClient');
        refreshSocketAuth(token);
      } catch {
        /* socket layer not loaded on this screen — nothing to refresh */
      }
    },
  }
);

/**
 * Renew a session, at most once concurrently per audience. Resolves to the new
 * access token, or null when it could not be renewed.
 *
 * EXPORTED for the realtime socket (user/provider) and the admin console's
 * proactive refresh. Both must come through this single-flight path rather
 * than a second refresh racing it: refresh tokens ROTATE, so the loser of that
 * race presents an already-replaced token — and the admin API treats a
 * replayed refresh token as theft and revokes the session.
 */
export const refreshSessionOnce = async (audience: SessionAudience = 'account'): Promise<string | null> =>
  (await refresher(audience)).token;

/** The session cannot be recovered: clear only that audience's tokens, then tell the UI. */
const handleSessionLost = async (audience: SessionAudience): Promise<void> => {
  if (audience === 'admin') {
    await clearAdminSession();
  } else {
    await clearAuthData();
  }
  emitSessionEnded(audience, 'expired');
};

const mainAuthOptions: AuthRecoveryOptions = {
  isPublic: isPublicEndpoint,
  // Attach the token matching the route's audience. Falling back to "admin
  // token first" used to hijack requests for a signed-in user whenever a stale
  // admin session sat in storage — a 403 on users/profile that reads as a
  // broken screen.
  tokenFor: async (url) => {
    const routeAudience = audienceForUrl(url);
    const { token } = await tokenForRequest(routeAudience);
    if (!isValidToken(token)) return { token: null, audience: 'account' };
    // An admin route's 401 is the admin session's to recover, even if the
    // token itself can't be decoded to say so.
    const admin = routeAudience === 'admin' || tokenAudience(token) === 'admin';
    return { token, audience: admin ? 'admin' : 'account' };
  },
  currentToken: async (audience) => {
    if (audience === 'admin') return (await loadAdminSession())?.accessToken ?? null;
    const token = await retrieveData(KeyForStorage.accessToken);
    return isValidToken(token) ? token : null;
  },
  refresh: refresher,
  onSessionLost: handleSessionLost,
};

// Error reporting runs before recovery. A 401 that is about to be refreshed and
// replayed is not an error — logging it as one put a red "API error" in front
// of QA for requests that then succeeded. Only the status and error code are
// logged: response bodies can carry personal data and tokens.
MainAxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const bestEffort = (error.config?.headers as any)?.['x-best-effort'] === '1';
    const summary = {
      status: error.response?.status,
      code: error.response?.data?.error?.code ?? error.response?.data?.code ?? error.code,
      method: error.config?.method,
      url: error.config?.url,
    };
    if (willRecover(error, isPublicEndpoint) || bestEffort) {
      devLog(bestEffort ? 'ℹ️ best-effort request failed (ignored):' : 'ℹ️ 401 — refreshing and retrying:', summary);
    } else {
      console.error('❌ API error:', summary);
    }
    if (summary.code === 'PASSWORD_CHANGE_REQUIRED') emitAdminRestricted('password_change');
    if (summary.code === 'TOTP_ENROLMENT_REQUIRED') emitAdminRestricted('totp_enrol');
    if (!error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error')) {
      console.error(
        Platform.OS === 'android'
          ? 'Network is down or unreachable (Android: check the network security config)'
          : 'Network is down or unreachable'
      );
    }
    return Promise.reject(error);
  }
);

attachAuthRecovery(MainAxiosInstance, mainAuthOptions);

/**
 * The refresh and session-loss handling every other axios instance must share
 * (shoppingAxios). A second refresher would race this one on the same rotating
 * refresh token.
 */
export const sharedSessionRecovery: Pick<AuthRecoveryOptions, 'currentToken' | 'refresh' | 'onSessionLost'> = {
  currentToken: mainAuthOptions.currentToken,
  refresh: mainAuthOptions.refresh,
  onSessionLost: mainAuthOptions.onSessionLost,
};

const defaultConfig = {
  ...axios.defaults.headers,
};

interface INetworkRequest {
  URL: string;
  headers?: any;
  params?: any;
  data?: any;
  [key: string]: any;
}

// Main API (for all MetroMatrix endpoints)
export const API = {
  GET: async ({ params, URL, headers }: INetworkRequest) => {
    return await MainAxiosInstance.get(URL, {
      ...defaultConfig,
      headers: headers,
      params,
    });
  },

  POST: async ({ headers, data, URL, ...rest }: INetworkRequest) => {
    console.log('📤 POST Request:', { URL });
    return await MainAxiosInstance.post(URL, data, {
      ...defaultConfig,
      headers: headers,
      ...rest,
    });
  },

  PUT: async ({ data, URL, headers, params }: INetworkRequest) => {
    return await MainAxiosInstance.put(URL, data, {
      ...defaultConfig,
      headers: headers,
      params: params || {},
    });
  },

  // `data` is the request body. Admin deletes require a reason in it
  // (DELETE /admin/providers/:id { reason }); axios only sends it when asked.
  DELETE: async ({ headers, params, URL, data }: INetworkRequest) => {
    return await MainAxiosInstance.delete(URL, {
      ...defaultConfig,
      headers: headers,
      params,
      data,
    });
  },

  PATCH: async ({ headers, data, URL, ...rest }: INetworkRequest) => {
    return await MainAxiosInstance.patch(URL, data, {
      ...defaultConfig,
      headers: headers,
      ...rest,
    });
  },
};

// The typed admin client (networks/admin/client.ts) uses the same instance so
// admin calls get the same auth and refresh handling as everything else.
export { MainAxiosInstance };

export default API;