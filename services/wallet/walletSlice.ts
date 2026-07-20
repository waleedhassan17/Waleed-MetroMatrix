/**
 * ============================================
 * Centralized Wallet Slice
 * ============================================
 * Single source of truth for wallet state across User, Provider, and Admin.
 * The backend determines the wallet owner from the JWT — no separate logic needed.
 *
 * Features:
 *  - Balance & transactions (User + Provider)
 *  - Top-up via Stripe Checkout (User + Provider)
 *  - P2P Transfer (User ↔ Provider)
 *  - Stripe Connect onboarding & status (Provider)
 *  - Payout to bank (Provider)
 */

import { createAppSlice } from "../../store/createAppSlice";
import {
  fetchWalletApi,
  fetchWalletTransactionsApi,
  createTopUpSessionApi,
  transferApi,
  startConnectOnboardingApi,
  getConnectStatusApi,
  requestPayoutApi,
} from "../../networks/wallet/walletApi";
import type {
  WalletTransaction,
  WalletPagination,
  TransferRequest,
  TransferResponse,
  ConnectStatusResponse,
  ConnectStatus,
  PayoutRequest,
  PayoutResponse,
} from "../../models/wallet";

// ============================================
// TYPE DEFINITIONS
// ============================================
export interface ConnectState {
  status: ConnectStatus;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: string[];
  loading: boolean;
  onboardingUrl: string | null;
  onboarding: boolean;
}

export interface TransactionHistoryFilters {
  module?: string;
  source?: string;
  type?: 'credit' | 'debit';
  from?: string;
  to?: string;
}

export interface WalletState {
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
  pagination: WalletPagination;

  // Unified TransactionHistory screen (Part 2.5) — a SEPARATE, filterable,
  // paginated list from the wallet home screen's `transactions` above, so
  // filtering history doesn't disturb what the home screen shows.
  historyTransactions: WalletTransaction[];
  historyPagination: WalletPagination;
  historyLoading: boolean;
  historyError: string | null;
  historyFilters: TransactionHistoryFilters;

  loading: boolean;
  toppingUp: boolean;
  transferring: boolean;
  payingOut: boolean;

  error: string | null;

  lastTopUpSessionId: string | null;
  lastTopUpUrl: string | null;
  lastTransfer: TransferResponse | null;
  lastPayout: PayoutResponse | null;

  connect: ConnectState;
}

// ============================================
// INITIAL STATE
// ============================================
const initialConnect: ConnectState = {
  status: 'not_started',
  accountId: null,
  chargesEnabled: false,
  payoutsEnabled: false,
  detailsSubmitted: false,
  requirementsDue: [],
  loading: false,
  onboardingUrl: null,
  onboarding: false,
};

const initialState: WalletState = {
  balance: 0,
  currency: 'PKR',
  transactions: [],
  pagination: { page: 1, limit: 20, total: 0, pages: 0 },

  historyTransactions: [],
  historyPagination: { page: 1, limit: 20, total: 0, pages: 0 },
  historyLoading: false,
  historyError: null,
  historyFilters: {},

  loading: false,
  toppingUp: false,
  transferring: false,
  payingOut: false,

  error: null,

  lastTopUpSessionId: null,
  lastTopUpUrl: null,
  lastTransfer: null,
  lastPayout: null,

  connect: { ...initialConnect },
};

// ============================================
// SLICE DEFINITION
// ============================================
export const walletSlice = createAppSlice({
  name: 'wallet',
  initialState,
  reducers: (create) => ({
    // Async Thunk: Fetch Wallet Data
    fetchWallet: create.asyncThunk(
      async (
        args: { page?: number; limit?: number } | undefined,
        { rejectWithValue }
      ) => {
        try {
          const page = args?.page ?? 1;
          const limit = args?.limit ?? 20;
          const response = await fetchWalletApi({ page, limit });
          return response;
        } catch (error: any) {
          return rejectWithValue(error.message || 'Failed to fetch wallet data');
        }
      },
      {
        pending: (state) => {
          state.loading = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.loading = false;
          state.balance = action.payload.wallet.balance;
          state.currency = action.payload.wallet.currency;
          state.transactions = action.payload.transactions;
          if (action.payload.pagination) {
            state.pagination = action.payload.pagination;
          }
          state.error = null;
        },
        rejected: (state, action) => {
          state.loading = false;
          state.error = action.payload as string;
        },
      }
    ),

    // Async Thunk: Unified transaction history — filterable by module,
    // source, type and date range (Part C.5 backend, Part 2.5 frontend).
    // `append: true` (e.g. "load more" pagination) concatenates onto the
    // existing list instead of replacing it.
    fetchTransactionHistory: create.asyncThunk(
      async (
        args: (TransactionHistoryFilters & { page?: number; limit?: number; append?: boolean }) | undefined,
        { rejectWithValue }
      ) => {
        try {
          const { append, ...params } = args || {};
          const response = await fetchWalletTransactionsApi(params);
          return { ...response, append: !!append, filters: params };
        } catch (error: any) {
          return rejectWithValue(error.message || 'Failed to fetch transaction history');
        }
      },
      {
        pending: (state) => {
          state.historyLoading = true;
          state.historyError = null;
        },
        fulfilled: (state, action) => {
          state.historyLoading = false;
          state.historyTransactions = action.payload.append
            ? [...state.historyTransactions, ...action.payload.transactions]
            : action.payload.transactions;
          if (action.payload.pagination) {
            state.historyPagination = action.payload.pagination;
          }
          state.historyFilters = action.payload.filters;
          state.historyError = null;
          // Same wallet, freshest read — keep the balance in sync too.
          if (action.payload.wallet) {
            state.balance = action.payload.wallet.balance;
            state.currency = action.payload.wallet.currency;
          }
        },
        rejected: (state, action) => {
          state.historyLoading = false;
          state.historyError = action.payload as string;
        },
      }
    ),

    // Async Thunk: Create Top-Up Session
    createTopUpSession: create.asyncThunk(
      async ({ amount }: { amount: number }, { rejectWithValue }) => {
        try {
          const response = await createTopUpSessionApi({ amount });
          return response;
        } catch (error: any) {
          return rejectWithValue(error.message || 'Failed to create top-up session');
        }
      },
      {
        pending: (state) => {
          state.toppingUp = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.toppingUp = false;
          state.lastTopUpSessionId = action.payload.sessionId;
          state.lastTopUpUrl = action.payload.url;
          state.error = null;
        },
        rejected: (state, action) => {
          state.toppingUp = false;
          state.error = action.payload as string;
        },
      }
    ),

    // Async Thunk: P2P Transfer
    transfer: create.asyncThunk(
      async (payload: TransferRequest, { rejectWithValue }) => {
        try {
          const response = await transferApi(payload);
          return response;
        } catch (error: any) {
          return rejectWithValue(error.message || 'Transfer failed');
        }
      },
      {
        pending: (state) => {
          state.transferring = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.transferring = false;
          state.lastTransfer = action.payload;
          // Backend returns updated sender wallet - sync balance
          if (action.payload.senderWallet) {
            state.balance = action.payload.senderWallet.balance;
            state.currency = action.payload.senderWallet.currency;
          }
          state.error = null;
        },
        rejected: (state, action) => {
          state.transferring = false;
          state.error = action.payload as string;
        },
      }
    ),

    // Async Thunk: Fetch Stripe Connect Status (Provider only)
    fetchConnectStatus: create.asyncThunk(
      async (_arg: void | undefined, { rejectWithValue }) => {
        try {
          const response = await getConnectStatusApi();
          return response;
        } catch (error: any) {
          return rejectWithValue(error.message || 'Failed to fetch Connect status');
        }
      },
      {
        pending: (state) => {
          state.connect.loading = true;
        },
        fulfilled: (state, action) => {
          const r: ConnectStatusResponse = action.payload;
          state.connect.loading = false;
          state.connect.status = r.status;
          state.connect.accountId = r.accountId;
          state.connect.chargesEnabled = r.chargesEnabled;
          state.connect.payoutsEnabled = r.payoutsEnabled;
          state.connect.detailsSubmitted = r.detailsSubmitted;
          state.connect.requirementsDue = r.live?.requirementsDue ?? [];
        },
        rejected: (state) => {
          state.connect.loading = false;
        },
      }
    ),

    // Async Thunk: Start/Refresh Stripe Connect Onboarding
    startConnectOnboarding: create.asyncThunk(
      async (_arg: void | undefined, { rejectWithValue }) => {
        try {
          const response = await startConnectOnboardingApi();
          return response;
        } catch (error: any) {
          return rejectWithValue(error.message || 'Failed to start onboarding');
        }
      },
      {
        pending: (state) => {
          state.connect.onboarding = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.connect.onboarding = false;
          state.connect.onboardingUrl = action.payload.url;
          state.connect.accountId = action.payload.accountId;
          state.connect.status = action.payload.status;
        },
        rejected: (state, action) => {
          state.connect.onboarding = false;
          state.error = action.payload as string;
        },
      }
    ),

    // Async Thunk: Request Payout (Provider only)
    requestPayout: create.asyncThunk(
      async (payload: PayoutRequest, { rejectWithValue }) => {
        try {
          const response = await requestPayoutApi(payload);
          return response;
        } catch (error: any) {
          return rejectWithValue(error.message || 'Payout failed');
        }
      },
      {
        pending: (state) => {
          state.payingOut = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.payingOut = false;
          state.lastPayout = action.payload;
          if (action.payload.wallet) {
            state.balance = action.payload.wallet.balance;
            state.currency = action.payload.wallet.currency;
          }
        },
        rejected: (state, action) => {
          state.payingOut = false;
          state.error = action.payload as string;
        },
      }
    ),

    // Sync Reducer: Clear Wallet Error
    clearWalletError: create.reducer((state) => {
      state.error = null;
    }),

    // Sync Reducer: Clear last transfer / payout snapshots
    clearLastTransfer: create.reducer((state) => {
      state.lastTransfer = null;
    }),
    clearLastPayout: create.reducer((state) => {
      state.lastPayout = null;
    }),
    clearOnboardingUrl: create.reducer((state) => {
      state.connect.onboardingUrl = null;
    }),

    // Sync Reducer: Reset Wallet State
    resetWallet: create.reducer(() => initialState),
  }),

  selectors: {
    selectWallet: (state) => state,
    selectBalance: (state) => state.balance,
    selectCurrency: (state) => state.currency,
    selectTransactions: (state) => state.transactions,
    selectHistoryTransactions: (state) => state.historyTransactions,
    selectHistoryPagination: (state) => state.historyPagination,
    selectHistoryLoading: (state) => state.historyLoading,
    selectHistoryError: (state) => state.historyError,
    selectHistoryFilters: (state) => state.historyFilters,
    selectLoading: (state) => state.loading,
    selectToppingUp: (state) => state.toppingUp,
    selectTransferring: (state) => state.transferring,
    selectPayingOut: (state) => state.payingOut,
    selectError: (state) => state.error,
    selectLastTopUpSessionId: (state) => state.lastTopUpSessionId,
    selectLastTransfer: (state) => state.lastTransfer,
    selectLastPayout: (state) => state.lastPayout,
    selectConnect: (state) => state.connect,
  },
});

// ============================================
// EXPORT ACTIONS
// ============================================
export const {
  fetchWallet,
  fetchTransactionHistory,
  createTopUpSession,
  transfer,
  fetchConnectStatus,
  startConnectOnboarding,
  requestPayout,
  clearWalletError,
  clearLastTransfer,
  clearLastPayout,
  clearOnboardingUrl,
  resetWallet,
} = walletSlice.actions;

// ============================================
// EXPORT SELECTORS
// ============================================
export const {
  selectWallet,
  selectBalance,
  selectCurrency,
  selectTransactions,
  selectHistoryTransactions,
  selectHistoryPagination,
  selectHistoryLoading,
  selectHistoryError,
  selectHistoryFilters,
  selectLoading,
  selectToppingUp,
  selectTransferring,
  selectPayingOut,
  selectError,
  selectLastTopUpSessionId,
  selectLastTransfer,
  selectLastPayout,
  selectConnect,
} = walletSlice.selectors;

// ============================================
// EXPORT REDUCER
// ============================================
export default walletSlice.reducer;
