/**
 * ============================================
 * DEPRECATED: This file is a re-export proxy.
 * The canonical wallet slice now lives at:
 *   services/wallet/walletSlice.ts
 *
 * All new code should import from:
 *   import { ... } from '../../services/wallet';
 * ============================================
 */
export {
  walletSlice,
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
} from '../../../services/wallet/walletSlice';

export type { WalletState, ConnectState } from '../../../services/wallet/walletSlice';

export { default } from '../../../services/wallet/walletSlice';
