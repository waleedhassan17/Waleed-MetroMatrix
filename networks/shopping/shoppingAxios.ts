// ============================================
// Shopping Module - Shared Axios Instance
// Base URL comes from config/env.ts (one API host for the whole app).
// ============================================

import axios from "axios";
import { clearAuthData } from "../../utils/storage_utils/storageUtils";
import { SHOPPING_API_URL } from "../../config/env";
import { Audience, tokenForRequest } from "../network/tokenSelection";

const TIMEOUT = 30000;

// Which audience a shopping path belongs to. The module mounts /admin/* for
// admins and /vendor/* for providers; everything else (cart, wishlist, orders,
// checkout, addresses, reviews) is a user route behind userOnly.
const audienceForUrl = (url?: string): Audience => {
  const path = (url || "").replace(/^\/+/, "");
  if (path.startsWith("admin")) return "admin";
  if (path.startsWith("vendor")) return "provider";
  return "user";
};

const ShoppingAxiosInstance = axios.create({
  baseURL: SHOPPING_API_URL,
  responseType: "json",
  timeout: TIMEOUT,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach the token that matches the route's audience.
ShoppingAxiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const { token } = await tokenForRequest(audienceForUrl(config.url));
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        (config as any).__sentAuth = true;
      }
    } catch {
      // proceed unauthenticated; protected endpoints will 401
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: 401 clears stale auth — but only when we actually sent
// a token. If we deliberately withheld a mismatched one, the session we still
// hold is valid for its own audience and must not be wiped.
ShoppingAxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && error.config?.__sentAuth) {
      await clearAuthData();
    }
    return Promise.reject(error);
  }
);

// Error extraction helper — use for every shopping error path
export const extractShoppingError = (e: any, fallback: string): string => {
  // Transport failures have no response body, so the old code fell through to
  // `e.message` and showed the shopper raw axios text: "timeout of 30000ms
  // exceeded" or "Network Error". Those are the two most common failures on a
  // phone, and they are exactly the ones a user might act on — so say
  // something they can actually act on.
  if (!e?.response) {
    if (e?.code === "ECONNABORTED" || /timeout/i.test(e?.message || "")) {
      return "This is taking longer than usual. Check your connection and try again.";
    }
    if (/network/i.test(e?.message || "")) {
      return "Can't reach the server. Check your internet connection and try again.";
    }
  }

  const data = e?.response?.data;
  if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    if (typeof first === "string") return first;
    if (first?.msg) return first.msg;
    if (first?.message) return first.message;
    if (typeof first === "object") {
      const v = Object.values(first)[0];
      if (typeof v === "string") return v;
    }
  }
  return data?.error || data?.message || e?.message || fallback;
};

export default ShoppingAxiosInstance;
