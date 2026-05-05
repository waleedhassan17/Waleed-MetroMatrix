/**
 * Wallet Type Definitions
 * Matches the MetroMatrix Wallet API response schema.
 */

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type TransactionSource =
  | 'stripe_topup'
  | 'service_payment'
  | 'refund'
  | 'admin_adjustment'
  | 'payout'
  | 'transfer_in'
  | 'transfer_out'
  | 'transfer_fee'
  | string; // forward-compatible

export type CounterpartyType = 'User' | 'Provider';

export interface TransactionCounterparty {
  id: string;
  type: CounterpartyType;
}

export interface WalletTransaction {
  _id: string;
  wallet?: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  description: string;
  status: TransactionStatus;
  source: TransactionSource;

  // Transfer-specific
  counterparty?: TransactionCounterparty;
  transferGroupId?: string;
  idempotencyKey?: string;

  // Stripe top-up
  stripeSessionId?: string;
  stripePaymentIntentId?: string;

  // Payout
  stripeTransferId?: string;
  stripePayoutId?: string;
  stripeConnectAccountId?: string;

  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

export interface WalletData {
  balance: number;
  currency: string;
}

export interface WalletPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface WalletResponse {
  success: boolean;
  wallet: WalletData;
  transactions: WalletTransaction[];
  pagination: WalletPagination;
}

export interface TopUpSessionResponse {
  success: boolean;
  sessionId: string;
  url: string;
}

// ============================================================
// TRANSFER (P2P)
// ============================================================
export interface TransferRequest {
  receiverId: string;
  receiverType: CounterpartyType;
  amount: number;
  description?: string;
  idempotencyKey?: string;
}

export interface TransferTransactionSummary {
  _id: string;
  source: TransactionSource;
  amount: number;
  status: TransactionStatus;
}

export interface TransferResponse {
  success: boolean;
  alreadyProcessed: boolean;
  transferGroupId: string;
  senderWallet: WalletData;
  senderTransaction: TransferTransactionSummary;
  receiverTransaction: TransferTransactionSummary;
  feeTransaction: TransferTransactionSummary | null;
}

// ============================================================
// STRIPE CONNECT (PROVIDER)
// ============================================================
export type ConnectStatus = 'not_started' | 'pending' | 'restricted' | 'active';

export interface ConnectOnboardResponse {
  success: boolean;
  url: string;
  accountId: string;
  status: ConnectStatus;
}

export interface ConnectLiveStatus {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: string[];
}

export interface ConnectStatusResponse {
  success: boolean;
  status: ConnectStatus;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  live?: ConnectLiveStatus;
}

// ============================================================
// PAYOUT (PROVIDER)
// ============================================================
export interface PayoutRequest {
  amount: number;
  description?: string;
  idempotencyKey?: string;
}

export interface PayoutStripeInfo {
  transferId: string;
  payoutId: string;
  status: string;
  arrivalDate: number;
}

export interface PayoutTransactionSummary {
  _id: string;
  source: 'payout';
  status: TransactionStatus;
  stripeTransferId?: string;
  stripePayoutId?: string;
}

export interface PayoutResponse {
  success: boolean;
  wallet: WalletData;
  transaction: PayoutTransactionSummary;
  stripe: PayoutStripeInfo;
}
