import axios, { AxiosInstance as AxiosInstanceType } from "axios";
import { Platform } from "react-native";
import { store } from "../../store/store";
import { clearAuthData } from "../../utils/storage_utils/storageUtils";
import { Audience, tokenForRequest } from "./tokenSelection";

// API Configuration
// PRODUCTION (Vercel) — the one backend host for the whole app (see vercel.md).
export const API_URL = "https://metro-matrix-backend.vercel.app/api";
// Local testing (web): "http://localhost:5000/api"
// LAN IP (for Expo Go on a physical device): "http://192.168.100.71:5000/api"
// Legacy Heroku: "https://metromatrix-backend-8758842b3e4c.herokuapp.com/api"

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

// Response interceptor for Main API
MainAxiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ API Response status:', response.status);
    return response;
  },
  async (error) => {
    console.error('❌ API Response error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
    });

    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      console.error("Network is down or unreachable");
      
      if (Platform.OS === 'android') {
        console.error('⚠️ Android: Check network security config');
      }
    }

    // Only clear auth data for 401 errors on authenticated endpoints
    if (error.response && error.response.status === 401) {
      const isUnauthenticatedEndpoint = UNAUTHENTICATED_ENDPOINTS.some(endpoint => 
        error.config?.url?.includes(endpoint)
      );
      
      // Only wipe the session if we actually presented a token. When the
      // interceptor withheld a mismatched one, the session we still hold is
      // valid for its own audience and must survive.
      if (!isUnauthenticatedEndpoint && (error.config as any)?.__sentAuth) {
        console.warn('⚠️ 401 on authenticated endpoint - clearing auth data');
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