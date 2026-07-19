import axios from "axios";
import {
  WalletResponse,
  TopUpSessionResponse,
  TransferRequest,
  TransferResponse,
  ConnectOnboardResponse,
  ConnectStatusResponse,
  PayoutRequest,
  PayoutResponse,
} from "../../models/wallet";
import { KeyForStorage, retrieveData, clearAuthData } from "../../utils/storage_utils/storageUtils";
import { API_URL } from "../network/network";

/**
 * Wallet API Configuration
 *
 * The MetroMatrix Wallet API is mounted under `/api/wallet` on the
 * main backend. Both users and providers authenticate using the same JWT
 * access token - the backend identifies the account type from the token.
 */
export const WALLET_API_URL = `${API_URL}/wallet`;

/**
 * Generate a UUID v4 for idempotency keys.
 * Works in React Native without crypto.randomUUID.
 */
export const generateIdempotencyKey = (): string => {
  // RFC 4122 v4 implementation using Math.random
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const TIMEOUT = 30000;

// Dedicated axios instance for wallet endpoints
const WalletAxiosInstance = axios.create({
  baseURL: WALLET_API_URL,
  responseType: "json",
  timeout: TIMEOUT,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

const isValidToken = (token: any): token is string => {
  if (!token || typeof token !== "string") return false;
  const invalid = ["null", "undefined", "", "false", "0"];
  if (invalid.includes(token.trim().toLowerCase())) return false;
  return token.trim().length >= 10;
};

// Request interceptor: inject JWT for every wallet call
WalletAxiosInstance.interceptors.request.use(
  async (config) => {
    try {
      // Prefer admin token (if logged in as admin), else user/provider token
      let token = await retrieveData(KeyForStorage.adminToken);
      let source = "admin";

      if (!isValidToken(token)) {
        token = await retrieveData(KeyForStorage.accessToken);
        source = "user/provider";
      }

      if (isValidToken(token)) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log(`💳 [Wallet] Injected ${source} token`);
      } else {
        console.warn("⚠️ [Wallet] No valid token for request:", config.url);
      }
    } catch (err) {
      console.error("❌ [Wallet] Token retrieval error:", err);
    }

    console.log(
      "💳 [Wallet] Request:",
      (config.method || "").toUpperCase(),
      `${config.baseURL}/${config.url}`
    );
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: logging + 401 handling
WalletAxiosInstance.interceptors.response.use(
  (response) => {
    console.log("✅ [Wallet] Response:", response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.error("❌ [Wallet] Response error:", {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });

    if (error.response?.status === 401) {
      console.warn("⚠️ [Wallet] 401 - clearing auth data");
      await clearAuthData();
    }

    return Promise.reject(error);
  }
);

// ============================================================
// Error extraction helper
// ============================================================
const extractError = (e: any, fallback: string): string => {
  const data = e?.response?.data;
  if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    if (typeof first === "string") return first;
    if (first?.msg) return first.msg;
    if (first?.message) return first.message;
  }
  return data?.error || data?.message || e?.message || fallback;
};

// ============================================================
// 1. Fetch Wallet (user OR provider - backend decides based on JWT)
// GET /me
// ============================================================
export const fetchWalletApi = async ({ page = 1, limit = 20 } = {}) => {
  try {
    console.log("📤 Fetching wallet data (page:", page, "limit:", limit, ")");

    const response = await WalletAxiosInstance.get("/me", {
      params: { page, limit },
    });

    console.log("✅ Wallet data fetched successfully");
    return response.data as WalletResponse;
  } catch (e: any) {
    const errorMessage = extractError(e, "Failed to fetch wallet data");
    console.error("❌ Fetch wallet error:", errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================
// 2. Create Stripe Checkout Session for Wallet Top-Up
// POST /topup/checkout
// ============================================================
export const createTopUpSessionApi = async ({ amount }: { amount: number }) => {
  try {
    if (typeof amount !== "number" || !isFinite(amount)) {
      throw new Error("Amount must be a valid number");
    }
    if (amount < 1 || amount > 10000) {
      throw new Error("Amount must be between 1 and 10000");
    }

    console.log("📤 Creating top-up session for amount:", amount);

    const response = await WalletAxiosInstance.post("/topup/checkout", {
      amount,
    });

    console.log("✅ Top-up session created:", response.data?.sessionId);
    return response.data as TopUpSessionResponse;
  } catch (e: any) {
    const errorMessage = extractError(e, "Failed to create top-up session");
    console.error("❌ Create top-up session error:", errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================
// 3. P2P Wallet Transfer
// POST /transfer
// ============================================================
export const transferApi = async (payload: TransferRequest) => {
  try {
    const { receiverId, receiverType, amount, description, idempotencyKey } = payload;

    // Client-side validation
    if (!receiverId) throw new Error("Receiver is required");
    if (!["User", "Provider"].includes(receiverType)) {
      throw new Error("Invalid receiver type");
    }
    if (typeof amount !== "number" || !isFinite(amount)) {
      throw new Error("Amount must be a valid number");
    }
    if (amount < 0.01 || amount > 100000) {
      throw new Error("Amount must be between 0.01 and 100000");
    }
    if (description && description.length > 280) {
      throw new Error("Description must be 280 characters or less");
    }

    // Always send an idempotency key — prevents double-debits on retries
    const key = idempotencyKey || generateIdempotencyKey();

    console.log("📤 Transfer:", {
      receiverType,
      receiverId,
      amount,
      idempotencyKey: key,
    });

    const response = await WalletAxiosInstance.post("/transfer", {
      receiverId,
      receiverType,
      amount,
      description,
      idempotencyKey: key,
    });

    console.log(
      "✅ Transfer completed:",
      response.data?.transferGroupId,
      response.data?.alreadyProcessed ? "(replayed)" : ""
    );
    return response.data as TransferResponse;
  } catch (e: any) {
    const errorMessage = extractError(e, "Failed to complete transfer");
    console.error("❌ Transfer error:", errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================
// 4. Start / Refresh Stripe Connect Onboarding (Provider only)
// POST /connect/onboard
// ============================================================
export const startConnectOnboardingApi = async () => {
  try {
    console.log("📤 Starting Connect onboarding");
    const response = await WalletAxiosInstance.post("/connect/onboard");
    console.log("✅ Connect onboarding link received");
    return response.data as ConnectOnboardResponse;
  } catch (e: any) {
    const errorMessage = extractError(e, "Failed to start Stripe Connect onboarding");
    console.error("❌ Connect onboarding error:", errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================
// 5. Fetch Stripe Connect Status (Provider only)
// GET /connect/status
// ============================================================
export const getConnectStatusApi = async () => {
  try {
    console.log("📤 Fetching Connect status");
    const response = await WalletAxiosInstance.get("/connect/status");
    console.log("✅ Connect status:", response.data?.status);
    return response.data as ConnectStatusResponse;
  } catch (e: any) {
    const errorMessage = extractError(e, "Failed to fetch Connect status");
    console.error("❌ Connect status error:", errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================
// 6. Request Payout to Bank Account (Provider only)
// POST /payout
// ============================================================
export const requestPayoutApi = async (payload: PayoutRequest) => {
  try {
    const { amount, description, idempotencyKey } = payload;

    if (typeof amount !== "number" || !isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }

    const key = idempotencyKey || generateIdempotencyKey();

    console.log("📤 Requesting payout:", { amount, idempotencyKey: key });

    const response = await WalletAxiosInstance.post("/payout", {
      amount,
      description,
      idempotencyKey: key,
    });

    console.log("✅ Payout initiated:", response.data?.stripe?.payoutId);
    return response.data as PayoutResponse;
  } catch (e: any) {
    const errorMessage = extractError(e, "Failed to request payout");
    console.error("❌ Payout error:", errorMessage);
    throw new Error(errorMessage);
  }
};
