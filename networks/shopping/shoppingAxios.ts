// ============================================
// Shopping Module - Shared Axios Instance
// ============================================

import axios from "axios";
import {
  KeyForStorage,
  retrieveData,
  clearAuthData,
} from "../../utils/storage_utils/storageUtils";

export const SHOPPING_API_URL =
  "https://metromatrix-backend-8758842b3e4c.herokuapp.com/api/shopping";

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

// Request interceptor: inject JWT
ShoppingAxiosInstance.interceptors.request.use(
  async (config) => {
    try {
      let token = await retrieveData(KeyForStorage.adminToken);
      let source = "admin";

      if (!isValidToken(token)) {
        token = await retrieveData(KeyForStorage.accessToken);
        source = "user/brand";
      }

      if (isValidToken(token)) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log(`🛍️ [Shopping] Injected ${source} token`);
      } else {
        console.warn("⚠️ [Shopping] No valid token for request:", config.url);
      }
    } catch (err) {
      console.error("❌ [Shopping] Token retrieval error:", err);
    }

    const urlPath = config.url?.startsWith('/') ? config.url.slice(1) : config.url;
    console.log(
      "🛍️ [Shopping] Request:",
      (config.method || "").toUpperCase(),
      `${config.baseURL}/${urlPath}`
    );
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: logging + 401 handling
ShoppingAxiosInstance.interceptors.response.use(
  (response) => {
    console.log(
      "✅ [Shopping] Response:",
      response.status,
      response.config.url
    );
    return response;
  },
  async (error) => {
    console.error("❌ [Shopping] Response error:", {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });

    if (error.response?.status === 401) {
      console.warn("⚠️ [Shopping] 401 - clearing auth data");
      await clearAuthData();
    }

    return Promise.reject(error);
  }
);

// Error extraction helper
export const extractShoppingError = (e: any, fallback: string): string => {
  const data = e?.response?.data;
  if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    if (typeof first === "string") return first;
    if (first?.msg) return first.msg;
    if (first?.message) return first.message;
  }
  return data?.error || data?.message || e?.message || fallback;
};

export default ShoppingAxiosInstance;
