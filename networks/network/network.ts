import axios, { AxiosInstance as AxiosInstanceType } from "axios";
import { Platform } from "react-native";
import { store } from "../../store/store";
import {
  clearAuthData,
  getRefreshToken,
  saveAuthTokens,
} from "../../utils/storage_utils/storageUtils";
import { Audience, tokenForRequest } from "./tokenSelection";

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
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://metro-matrix-backend.vercel.app/api";
// Local testing (web): "http://localhost:5000/api"
// LAN IP (for Expo Go on a physical device): "http://192.168.100.71:5000/api"

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
 * ✅ FIX: Robust token validation function
 * Checks for all possible invalid token values
 */
const isValidToken = (token: any): token is string => {
  if (token === null || token === undefined) {
    return false;
  }
  
  if (typeof token !== 'string') {
    return false;
  }
  
  const invalidStringValues = ['null', 'undefined', '', 'false', '0'];
  if (invalidStringValues.includes(token.trim().toLowerCase())) {
    return false;
  }
  
  if (token.trim().length < 10) {
    return false;
  }
  
  return true;
};

/**
 * ✅ List of endpoints that should NEVER have Authorization header
 * These endpoints work without authentication
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
  // ✅ Social Auth Endpoints (NO AUTH)
  'auth/google-signup',
  'auth/google-login',
  'auth/facebook-signup',
  'auth/facebook-login',
  // ✅ CRITICAL: Provider submission endpoints (NO AUTH)
  'admin/provider-submissions',
  'provider/approval-status',
];

/**
 * The account type a path is guarded for, or null when it serves all three
 * (auth/logout, auth/refresh, wallet/*, bookings/*, healthcare/*) — those fall
 * back to whoever is currently signed in.
 */
const audienceForUrl = (url?: string): Audience | null => {
  const path = (url || '').replace(/^\/+/, '');
  if (path.startsWith('admin/') || path === 'admin') return 'admin';
  if (path.startsWith('providers/') || path.startsWith('provider/')) return 'provider';
  if (path.startsWith('users/') || path === 'users') return 'user';
  return null;
};

// Request interceptor for Main API
MainAxiosInstance.interceptors.request.use(
  async (config) => {
    if (config.url) {
      console.log('🔍 API Request URL:', config.baseURL + '/' + config.url);
    }
    console.log('🔍 Request Method:', config.method?.toUpperCase());
    
    // Check if this endpoint should skip authentication
    const skipToken = UNAUTHENTICATED_ENDPOINTS.some(endpoint => 
      config.url?.includes(endpoint)
    );
    
    if (skipToken) {
      console.log('ℹ️ Skipping auth for unauthenticated endpoint:', config.url);
      // ✅ CRITICAL: Ensure NO Authorization header for unauthenticated endpoints
      if (config.headers.Authorization) {
        delete config.headers.Authorization;
        console.log('🗑️ Removed Authorization header for unauthenticated endpoint');
      }
    } else {
      // ✅ If Authorization header is already set (e.g., by admin APIs), don't overwrite
      if (config.headers.Authorization) {
        console.log('✅ Authorization header already set, skipping interceptor token injection');
      } else {
        try {
          // Attach the token matching the route's audience. Falling back to
          // "admin token first" here used to hijack requests for a signed-in
          // user whenever a stale admin session sat in storage — a 403 on
          // routes like users/profile that reads as a broken screen.
          const { token, source: tokenSource } = await tokenForRequest(
            audienceForUrl(config.url)
          );

          if (isValidToken(token)) {
            config.headers.Authorization = `Bearer ${token}`;
            (config as any).__sentAuth = true;
            console.log(`✅ Valid ${tokenSource} token injected by interceptor`);
          } else {
            console.warn('⚠️ No valid token found for request to:', config.url);
          }
        } catch (tokenError) {
          console.error('❌ Error retrieving token:', tokenError);
        }
      }
    }
    
    // Log final headers (without full token for security)
    const logHeaders = { ...config.headers };
    if (logHeaders.Authorization && typeof logHeaders.Authorization === 'string') {
      logHeaders.Authorization = logHeaders.Authorization.substring(0, 30) + '...';
    }
    console.log('📤 Final Request Headers:', JSON.stringify(logHeaders, null, 2));
    
    return config;
  },
  (error) => {
    console.error('❌ API Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Silent refresh-and-retry on 401.
 *
 * Access tokens are short-lived now (JWT_EXPIRE defaults to 15m on the
 * backend) so that a stolen one expires quickly. That only works if the app
 * can renew transparently — otherwise every user is thrown back to the login
 * screen a quarter of an hour into the session.
 *
 * The refresh has to be single-flight. A screen that fires five requests at
 * once gets five simultaneous 401s; refreshing five times would have four of
 * them racing, and since /auth/refresh rotates the stored refresh token, the
 * losers would present an already-replaced token and be rejected — logging
 * the user out precisely when the mechanism was supposed to keep them in. So
 * the first 401 performs the refresh and the rest wait on that same promise.
 */
let refreshPromise: Promise<string | null> | null = null;

const performTokenRefresh = async (): Promise<string | null> => {
  const refreshToken = await getRefreshToken();

  if (!isValidToken(refreshToken)) {
    console.warn('⚠️ No refresh token available — cannot renew session');
    return null;
  }

  try {
    // A bare axios call, not MainAxiosInstance: going through the instance
    // would re-enter these interceptors and, on a 401 from the refresh
    // itself, recurse.
    const { data } = await axios.post(
      `${API_URL}/auth/refresh`,
      { refreshToken },
      { timeout: TIMEOUT, headers: { 'Content-Type': 'application/json' } }
    );

    const newAccessToken = data?.accessToken;
    const newRefreshToken = data?.refreshToken;

    if (!isValidToken(newAccessToken)) {
      console.warn('⚠️ Refresh response contained no usable access token');
      return null;
    }

    await saveAuthTokens(newAccessToken, newRefreshToken);
    console.log('🔄 Session refreshed successfully');

    // The realtime socket only reads its token at handshake time, so rotating
    // the stored token here leaves the live socket authenticated with the OLD
    // one until the server expires it. Re-handshake now, or chat and incoming
    // calls silently stop working while REST calls carry on fine.
    // Imported lazily: socketClient pulls in config/env, and a top-level import
    // would create a cycle back through this module.
    try {
      const { refreshSocketAuth } = require('../../services/socket/socketClient');
      refreshSocketAuth(newAccessToken);
    } catch {
      /* socket layer not loaded on this screen — nothing to refresh */
    }

    return newAccessToken;
  } catch (refreshError: any) {
    console.warn('⚠️ Token refresh failed:', refreshError?.response?.status || refreshError?.message);
    return null;
  }
};

const refreshSessionOnce = (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

// Response interceptor for Main API
MainAxiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ API Response status:', response.status);
    return response;
  },
  async (error) => {
    // A 401 on an authenticated request is usually just an expired access
    // token, and the block below refreshes and replays it — the call then
    // succeeds. Logging it as an error up here, before that recovery has even
    // been attempted, put a red "API Response error" in front of QA for
    // requests that worked: adding a clinic reported a failure and added the
    // clinic anyway. Report the attempt quietly; only a failure that survives
    // recovery is an error, and the branches below say so.
    const willAttemptRecovery =
      error.response?.status === 401 &&
      (error.config as any)?.__sentAuth &&
      !(error.config as any)?.__retriedAfterRefresh &&
      !error.config?.url?.includes('auth/refresh');

    const report = willAttemptRecovery ? console.log : console.error;
    report(
      willAttemptRecovery
        ? 'ℹ️ 401 — refreshing token and retrying:'
        : '❌ API Response error:',
      {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      }
    );

    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      console.error("Network is down or unreachable");

      if (Platform.OS === 'android') {
        console.error('⚠️ Android: Check network security config');
      }
    }

    // Only act on 401s from authenticated endpoints
    if (error.response && error.response.status === 401) {
      const originalRequest = error.config;

      const isUnauthenticatedEndpoint = UNAUTHENTICATED_ENDPOINTS.some(endpoint =>
        originalRequest?.url?.includes(endpoint)
      );
      const isRefreshCall = originalRequest?.url?.includes('auth/refresh');

      // Only try to recover if we actually presented a token. When the
      // interceptor withheld a mismatched one, the session we still hold is
      // valid for its own audience and must survive.
      if (
        !isUnauthenticatedEndpoint &&
        !isRefreshCall &&
        (originalRequest as any)?.__sentAuth &&
        !(originalRequest as any)?.__retriedAfterRefresh
      ) {
        const newAccessToken = await refreshSessionOnce();

        if (newAccessToken) {
          // Replay the original request once with the fresh token.
          (originalRequest as any).__retriedAfterRefresh = true;
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${newAccessToken}`,
          };
          console.log('🔁 Retrying request with refreshed token:', originalRequest.url);
          return MainAxiosInstance(originalRequest);
        }

        // The refresh itself failed — the session really is gone.
        console.warn('⚠️ Refresh failed on 401 - clearing auth data');
        await clearAuthData();
      } else if (
        !isUnauthenticatedEndpoint &&
        (originalRequest as any)?.__sentAuth &&
        (isRefreshCall || (originalRequest as any)?.__retriedAfterRefresh)
      ) {
        // A 401 on the refresh call, or on the one retry we allow, means the
        // session cannot be recovered.
        console.warn('⚠️ 401 persisted after refresh - clearing auth data');
        await clearAuthData();
      }
    }

    return Promise.reject(error);
  }
);

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

  DELETE: async ({ headers, params, URL }: INetworkRequest) => {
    return await MainAxiosInstance.delete(URL, {
      ...defaultConfig,
      headers: headers,
      params,
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

export default API;