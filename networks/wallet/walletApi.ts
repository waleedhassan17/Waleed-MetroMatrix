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
import { API, API_URL } from "../network/network";

/**
 * Wallet API Configuration
 *
 * The MetroMatrix Wallet API is mounted under `/api/wallet` on the
 * main backend. Both users and providers authenticate using the same JWT
 * access token - the backend identifies the account type from the token.
 *
 * This module previously created its OWN axios instance with its own token
 * injection and 401-handling interceptors — the fourth base URL / interceptor
 * set in this app, alongside networks/network/network.ts,
 * networks/shopping/shoppingAxios.ts and networks/serviceProviders/config.ts.
 * It now rides the ONE shared `API` instance from network.ts, which already
 * injects the token and handles 401s. Every exported function's signature
 * and return type is unchanged, so no caller needed editing.
 */
export const WALLET_API_URL = `${API_URL}/wallet`;
const WALLET_PREFIX = "wallet";

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
    const response = await API.GET({
      URL: `${WALLET_PREFIX}/me`,
      params: { page, limit },
    });
    return response.data as WalletResponse;
  } catch (e: any) {
    throw new Error(extractError(e, "Failed to fetch wallet data"));
  }
};

// ============================================================
// 1b. Unified transaction history (Part C.5) — filterable by source,
// module, type, date range. Same endpoint for users and providers.
// GET /transactions
// ============================================================
export const fetchWalletTransactionsApi = async (params: {
  page?: number;
  limit?: number;
  source?: string;
  module?: string;
  type?: "credit" | "debit";
  from?: string;
  to?: string;
} = {}) => {
  try {
    const response = await API.GET({
      URL: `${WALLET_PREFIX}/transactions`,
      params,
    });
    return response.data as WalletResponse;
  } catch (e: any) {
    throw new Error(extractError(e, "Failed to fetch transaction history"));
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

    const response = await API.POST({
      URL: `${WALLET_PREFIX}/topup/checkout`,
      data: { amount },
    });
    return response.data as TopUpSessionResponse;
  } catch (e: any) {
    throw new Error(extractError(e, "Failed to create top-up session"));
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

    const response = await API.POST({
      URL: `${WALLET_PREFIX}/transfer`,
      data: { receiverId, receiverType, amount, description, idempotencyKey: key },
    });
    return response.data as TransferResponse;
  } catch (e: any) {
    throw new Error(extractError(e, "Failed to complete transfer"));
  }
};

// ============================================================
// 4. Start / Refresh Stripe Connect Onboarding (Provider only)
// POST /connect/onboard
// ============================================================
export const startConnectOnboardingApi = async () => {
  try {
    const response = await API.POST({ URL: `${WALLET_PREFIX}/connect/onboard`, data: {} });
    return response.data as ConnectOnboardResponse;
  } catch (e: any) {
    throw new Error(extractError(e, "Failed to start Stripe Connect onboarding"));
  }
};

// ============================================================
// 5. Fetch Stripe Connect Status (Provider only)
// GET /connect/status
// ============================================================
export const getConnectStatusApi = async () => {
  try {
    const response = await API.GET({ URL: `${WALLET_PREFIX}/connect/status` });
    return response.data as ConnectStatusResponse;
  } catch (e: any) {
    throw new Error(extractError(e, "Failed to fetch Connect status"));
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

    const response = await API.POST({
      URL: `${WALLET_PREFIX}/payout`,
      data: { amount, description, idempotencyKey: key },
    });
    return response.data as PayoutResponse;
  } catch (e: any) {
    throw new Error(extractError(e, "Failed to request payout"));
  }
};
