// ============================================================================
// Wallets in the admin console (/api/admin/wallets/*): every wallet and its
// ledger, manual adjustments with maker-checker, and the ledger check.
//
// Adjustments: one at or below the finance threshold is applied at once; one
// above it waits for a DIFFERENT super admin to approve or reject it (the
// server refuses the requester). Shapes are declared from
// controllers/adminWalletController.js and models/WalletAdjustment.toPublic.
//
// The Platform wallet only holds fees collected before October 2026; the
// platform takes no share of anything now.
// ============================================================================

import { adminApi, nextPageParam, type AdminError, type Page, type PageParam } from './adminApi';
import { adminApi as http, type ListMeta } from './client';
import { toAdminApiError } from './errors';

export type WalletOwnerType = 'User' | 'Provider' | 'Platform';

export interface AdminWallet {
  id: string;
  ownerId: string;
  ownerType: WalletOwnerType;
  ownerName: string;
  ownerEmail: string | null;
  balance: number;
  currency: string;
  lastActivityAt: string | null;
  createdAt: string;
}

export interface WalletTxn {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  currency?: string;
  description?: string;
  source: string;
  status: string;
  createdAt: string;
}

export type AdjustmentStatus = 'pending' | 'applying' | 'applied' | 'failed' | 'rejected';

export interface WalletAdjustment {
  id: string;
  walletId: string;
  direction: 'credit' | 'debit';
  amount: number;
  currency: string;
  reason: string;
  status: AdjustmentStatus;
  requiresApproval: boolean;
  thresholdAtRequest: number;
  requestedBy: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  balanceBefore?: number;
  balanceAfter?: number;
  failureReason: string | null;
  createdAt: string;
}

export interface AdjustResult {
  adjustment: WalletAdjustment;
  requiresApproval: boolean;
  wallet?: { id: string; balance: number; currency: string };
}

export interface Reconciliation {
  totalUserBalance: number;
  totalProviderBalance: number;
  /** Fees collected before Oct 2026; nothing new reaches it. */
  platformWalletBalance: number;
  sumOfAllWallets: number;
  totalToppedUp: number;
  totalPaidOut: number;
  netAdjustments: number;
  expected: number;
  drift: number;
  balanced: boolean;
  computedAt: string;
}

const fail = (err: unknown): { error: AdminError } => {
  const e = toAdminApiError(err);
  return { error: { status: e.status, code: e.code, message: e.message, details: e.details, requestId: e.requestId } };
};
async function run<T>(fn: () => Promise<T>): Promise<{ data: T } | { error: AdminError }> {
  try {
    return { data: await fn() };
  } catch (err) {
    return fail(err);
  }
}

const withId = <T>(record: unknown): T => {
  const r = (record ?? {}) as { _id?: unknown; id?: unknown };
  return { ...(record as object), id: String(r.id ?? r._id ?? '') } as T;
};
const asPage = <T>(items: unknown, meta?: ListMeta): Page<T> => {
  const list = Array.isArray(items) ? items.map((x) => withId<T>(x)) : [];
  return { items: list, meta: meta ?? { limit: list.length } };
};

type Q = Record<string, string | number | boolean | null | undefined>;
const FIRST_PAGE: PageParam = { page: 1 };
const PAGE_SIZE = 20;

const walletsApi = adminApi
  .enhanceEndpoints({ addTagTypes: ['Wallet', 'WalletTxn', 'Adjustment', 'Reconciliation'] })
  .injectEndpoints({
    endpoints: (build) => ({
      listWallets: build.infiniteQuery<Page<AdminWallet>, { ownerType?: WalletOwnerType; search?: string }, PageParam>({
        infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
        queryFn: ({ queryArg, pageParam }) =>
          run(async () => {
            const res = await http.get('/api/admin/wallets', { query: { ...(queryArg as Q), ...pageParam, limit: PAGE_SIZE } });
            return asPage<AdminWallet>(res.data, res.meta);
          }),
        providesTags: ['Wallet'],
      }),
      walletTransactions: build.infiniteQuery<Page<WalletTxn> & { wallet?: { balance: number; currency: string } }, string, PageParam>({
        infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
        queryFn: ({ queryArg: id, pageParam }) =>
          run(async () => {
            const res = await http.get('/api/admin/wallets/{id}/transactions', { params: { id }, query: { ...pageParam, limit: PAGE_SIZE } });
            const body = res.data as unknown as { wallet?: { balance: number; currency: string }; transactions?: unknown[] };
            return { ...asPage<WalletTxn>(body?.transactions, res.meta), wallet: body?.wallet };
          }),
        providesTags: (_r, _e, id) => [{ type: 'WalletTxn', id }],
      }),
      adjustWallet: build.mutation<AdjustResult, { id: string; type: 'credit' | 'debit'; amount: number; reason: string }>({
        queryFn: ({ id, ...body }) => run(async () => (await http.post('/api/admin/wallets/{id}/adjust', { params: { id }, body })).data as unknown as AdjustResult),
        invalidatesTags: (_r, _e, { id }) => [{ type: 'WalletTxn', id }, 'Wallet', 'Adjustment', 'Reconciliation', 'Queue', 'Overview'],
      }),
      listAdjustments: build.infiniteQuery<Page<WalletAdjustment>, { status?: AdjustmentStatus }, PageParam>({
        infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
        queryFn: ({ queryArg, pageParam }) =>
          run(async () => {
            const res = await http.get('/api/admin/wallets/adjustments', { query: { ...(queryArg as Q), ...pageParam, limit: PAGE_SIZE } });
            return asPage<WalletAdjustment>(res.data, res.meta);
          }),
        providesTags: ['Adjustment'],
      }),
      decideAdjustment: build.mutation<unknown, { id: string; decision: 'approve' | 'reject'; note?: string }>({
        queryFn: ({ id, decision, note }) =>
          run(async () =>
            decision === 'approve'
              ? (await http.post('/api/admin/wallets/adjustments/{adjustmentId}/approve', { params: { adjustmentId: id }, body: { note } })).data
              : (await http.post('/api/admin/wallets/adjustments/{adjustmentId}/reject', { params: { adjustmentId: id }, body: { note } })).data
          ),
        invalidatesTags: ['Adjustment', 'Wallet', 'WalletTxn', 'Reconciliation', 'Queue', 'Overview'],
      }),
      getReconciliation: build.query<Reconciliation, void>({
        queryFn: () => run(async () => (await http.get('/api/admin/wallets/reconciliation')).data as unknown as Reconciliation),
        providesTags: ['Reconciliation'],
      }),
    }),
  });

export const {
  useListWalletsInfiniteQuery,
  useWalletTransactionsInfiniteQuery,
  useAdjustWalletMutation,
  useListAdjustmentsInfiniteQuery,
  useDecideAdjustmentMutation,
  useGetReconciliationQuery,
} = walletsApi;

/** The endpoints themselves, for the end-to-end tests that drive them without screens. */
export const walletEndpoints = walletsApi.endpoints;
