// ============================================
// Shopping Module - Shared Axios Instance
// Base URL comes from config/env.ts (one API host for the whole app).
// ============================================

import axios from "axios";
import {
  KeyForStorage,
  retrieveData,
  clearAuthData,
} from "../../utils/storage_utils/storageUtils";
import { SHOPPING_API_URL } from "../../config/env";

const TIMEOUT = 30000;

const isValidToken = (token: any): token is string => {
  if (!token || typeof token !== "string") return false;
  const invalid = ["null", "undefined", "", "false", "0"];
  if (invalid.includes(token.trim().toLowerCase())) return false;
  return token.trim().length >= 10;
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

// Request interceptor: inject JWT (admin token first, then user/vendor token)
ShoppingAxiosInstance.interceptors.request.use(
  async (config) => {
    try {
      let token = await retrieveData(KeyForStorage.adminToken);
      if (!isValidToken(token)) {
        token = await retrieveData(KeyForStorage.accessToken);
      }
      if (isValidToken(token)) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // proceed unauthenticated; protected endpoints will 401
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: 401 clears stale auth
ShoppingAxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearAuthData();
    }
    return Promise.reject(error);
  }
);

// Error extraction helper — use for every shopping error path
export const extractShoppingError = (e: any, fallback: string): string => {
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
