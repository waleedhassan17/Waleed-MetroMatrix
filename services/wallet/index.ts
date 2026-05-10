/**
 * ============================================
 * Centralized Wallet Service
 * ============================================
 * Single entry point for all wallet functionality.
 * Used by User, Provider, and Admin modules.
 *
 * Usage:
 *   import { fetchWallet, selectBalance, WalletState } from '../../services/wallet';
 *   import { transferApi, fetchWalletApi } from '../../services/wallet';
 */

// ── Redux Slice (actions, selectors, state types) ──────────
export {
  walletSlice,
  // Actions
  fetchWallet,
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
  // Selectors
  selectWallet,
  selectBalance,
  selectCurrency,
  selectTransactions,
  selectLoading,
  selectToppingUp,
  selectTransferring,
  selectPayingOut,
  selectError,
  selectLastTopUpSessionId,
  selectLastTransfer,
  selectLastPayout,
  selectConnect,
} from './walletSlice';

export type { WalletState, ConnectState } from './walletSlice';

// ── Network API layer ──────────────────────────────────────
export {
  fetchWalletApi,
  createTopUpSessionApi,
  transferApi,
  startConnectOnboardingApi,
  getConnectStatusApi,
  requestPayoutApi,
  generateIdempotencyKey,
  WALLET_API_URL,
} from '../../networks/wallet/walletApi';

// ── Type definitions (models) ──────────────────────────────
export type {
  WalletTransaction,
  WalletData,
  WalletPagination,
  WalletResponse,
  TopUpSessionResponse,
  TransferRequest,
  TransferResponse,
  TransferTransactionSummary,
  TransactionStatus,
  TransactionSource,
  CounterpartyType,
  TransactionCounterparty,
  ConnectStatus,
  ConnectOnboardResponse,
  ConnectLiveStatus,
  ConnectStatusResponse,
  PayoutRequest,
  PayoutResponse,
  PayoutStripeInfo,
  PayoutTransactionSummary,
} from '../../models/wallet';
