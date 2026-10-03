// ============================================================================
// Home services in the admin console (GET/PATCH/POST /api/admin/{bookings,
// disputes,payout-requests,service-categories,homeservice/*}).
//
// On the admin data layer, over the typed client: paths and methods are
// checked against the contract. Response shapes are declared here from the
// backend controller (modules/homeservice/controllers/adminController.js),
// because the contract types these module endpoints generically (backend open
// item #14).
// ============================================================================

import { adminApi, nextPageParam, type AdminError, type Page, type PageParam } from './adminApi';
import { adminApi as http, type ListMeta } from './client';
import { toAdminApiError } from './errors';

export interface HSBookingRow {
  id: string;
  status: string;
  serviceCategory: string;
  serviceType: string;
  customer: { id: string; name: string; email: string } | null;
  provider: { id: string; name: string; email: string } | null;
  scheduledFor: string | null;
  price: number | null;
  paymentStatus: string;
  city: string;
  createdAt: string;
}

export interface HSBookingDetail extends HSBookingRow {
  description?: string;
  instructions?: string;
  address?: { line1?: string; line2?: string; city?: string; area?: string } | null;
  statusHistory: { status: string; role: string; changedAt: string | null; note: string }[];
  payment: { status: string; method: string | null; requestedAmount: number | null; paidAt: string | null };
  cancellation?: { by?: string; reason?: string; at?: string } | null;
  dispute: { id: string; status: string; reason: string } | null;
  review: { rating: number; comment?: string } | null;
  refund?: { paid: number; refunded: number; remaining: number };
}

export interface HSDispute {
  id: string;
  bookingId: string | null;
  customer: string;
  provider: string;
  raisedByRole: string;
  againstRole: string;
  reason: string;
  description: string;
  evidence: string[];
  status: 'open' | 'investigating' | 'resolved' | 'rejected';
  resolution: string | null;
  refundAmount: number;
  createdAt: string;
}

export interface HSPayout {
  id: string;
  provider: { id: string; name: string; email: string; completedJobs: number; rating: number; walletBalance: number } | null;
  amount: number;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface HSCategory {
  id: string;
  name: string;
  slug: string;
  providerSubType: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  image?: string;
  description?: string;
  basePrice: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface HSAnalytics {
  from: string;
  to: string;
  bookingsOverTime: { date: string; count: number }[];
  byCategory: { category: string; count: number; gross: number }[];
  byStatus: { status: string; count: number }[];
  revenue: number;
  commission: number;
  averageCompletionMinutes: number | null;
  cancellationRate: number | null;
  topProviders: { id: string; name: string; jobs: number; gross: number; rating: number | null }[];
}

export interface HSSettings {
  commissionPercent: number;
  defaultSearchRadiusKm: number;
  matchingWeights: { distance: number; rating: number; availability: number };
  minPayoutAmount: number;
  avgUrbanSpeedKmh: number;
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
const asPage = <T>(res: { data: unknown; meta?: ListMeta }): Page<T> => {
  const items = Array.isArray(res.data) ? (res.data as T[]) : [];
  return { items, meta: res.meta ?? { limit: items.length } };
};

type Q = Record<string, string | number | boolean | null | undefined>;
const FIRST_PAGE: PageParam = { page: 1 };

const homeServicesApi = adminApi.enhanceEndpoints({ addTagTypes: ['HSBooking', 'HSDispute', 'HSPayout', 'HSCategory', 'HSSettings'] }).injectEndpoints({
  endpoints: (build) => ({
    listHSBookings: build.infiniteQuery<Page<HSBookingRow>, { status?: string; search?: string }, PageParam>({
      infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
      queryFn: ({ queryArg, pageParam }) => run(async () => asPage<HSBookingRow>(await http.get('/api/admin/bookings', { query: { ...(queryArg as Q), ...pageParam } }))),
      providesTags: ['HSBooking'],
    }),
    getHSBooking: build.query<HSBookingDetail, string>({
      queryFn: (id) => run(async () => (await http.get('/api/admin/bookings/{id}', { params: { id } })).data as unknown as HSBookingDetail),
      providesTags: (_r, _e, id) => [{ type: 'HSBooking', id }],
    }),
    forceHSBookingStatus: build.mutation<unknown, { id: string; status: string; reason: string }>({
      queryFn: ({ id, status, reason }) => run(async () => (await http.patch('/api/admin/bookings/{id}/status', { params: { id }, body: { status, reason } })).data),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'HSBooking', id }, 'HSBooking', 'Overview'],
    }),
    refundHSBooking: build.mutation<{ refunded: boolean; amount: number; remainingRefundable: number }, { id: string; amount?: number; reason: string }>({
      queryFn: ({ id, amount, reason }) =>
        run(async () => (await http.post('/api/admin/bookings/{id}/refund', { params: { id }, body: { amount, reason } })).data as unknown as { refunded: boolean; amount: number; remainingRefundable: number }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'HSBooking', id }],
    }),

    listHSDisputes: build.infiniteQuery<Page<HSDispute>, { status?: string }, PageParam>({
      infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
      queryFn: ({ queryArg, pageParam }) => run(async () => asPage<HSDispute>(await http.get('/api/admin/disputes', { query: { ...(queryArg as Q), ...pageParam } }))),
      providesTags: ['HSDispute'],
    }),
    resolveHSDispute: build.mutation<unknown, { id: string; status: string; resolution?: string; refundAmount?: number; penalizeProvider?: number; reason?: string }>({
      queryFn: ({ id, ...body }) => run(async () => (await http.patch('/api/admin/disputes/{id}', { params: { id }, body })).data),
      invalidatesTags: ['HSDispute', 'HSBooking', 'Queue', 'Overview'],
    }),

    listHSPayouts: build.infiniteQuery<Page<HSPayout>, { status?: string }, PageParam>({
      infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
      queryFn: ({ queryArg, pageParam }) => run(async () => asPage<HSPayout>(await http.get('/api/admin/payout-requests', { query: { ...(queryArg as Q), ...pageParam } }))),
      providesTags: ['HSPayout'],
    }),
    decideHSPayout: build.mutation<unknown, { id: string; action: 'approve' | 'reject'; reason?: string }>({
      queryFn: ({ id, ...body }) => run(async () => (await http.patch('/api/admin/payout-requests/{id}', { params: { id }, body })).data),
      invalidatesTags: ['HSPayout', 'Queue', 'Overview'],
    }),

    listHSCategories: build.query<HSCategory[], void>({
      queryFn: () => run(async () => ((await http.get('/api/admin/service-categories')).data as unknown as HSCategory[]) ?? []),
      providesTags: ['HSCategory'],
    }),
    saveHSCategory: build.mutation<HSCategory, Partial<HSCategory> & { reason?: string }>({
      queryFn: ({ id, ...body }) =>
        run(async () =>
          id
            ? ((await http.patch('/api/admin/service-categories/{id}', { params: { id }, body })).data as unknown as HSCategory)
            : ((await http.post('/api/admin/service-categories', { body })).data as unknown as HSCategory)
        ),
      invalidatesTags: ['HSCategory', 'Meta'],
    }),
    deleteHSCategory: build.mutation<unknown, { id: string; reason: string }>({
      queryFn: ({ id, reason }) => run(async () => (await http.delete('/api/admin/service-categories/{id}', { params: { id }, body: { reason } })).data),
      invalidatesTags: ['HSCategory', 'Meta'],
    }),

    getHSAnalytics: build.query<HSAnalytics, { from?: string; to?: string }>({
      queryFn: (range) => run(async () => (await http.get('/api/admin/homeservice/analytics', { query: range })).data as unknown as HSAnalytics),
    }),
    getHSSettings: build.query<HSSettings, void>({
      queryFn: () => run(async () => (await http.get('/api/admin/homeservice/settings')).data as unknown as HSSettings),
      providesTags: ['HSSettings'],
    }),
    updateHSSettings: build.mutation<HSSettings, Partial<HSSettings> & { reason?: string }>({
      queryFn: (body) => run(async () => (await http.patch('/api/admin/homeservice/settings', { body })).data as unknown as HSSettings),
      invalidatesTags: ['HSSettings'],
    }),
  }),
});

export const {
  useListHSBookingsInfiniteQuery,
  useGetHSBookingQuery,
  useForceHSBookingStatusMutation,
  useRefundHSBookingMutation,
  useListHSDisputesInfiniteQuery,
  useResolveHSDisputeMutation,
  useListHSPayoutsInfiniteQuery,
  useDecideHSPayoutMutation,
  useListHSCategoriesQuery,
  useSaveHSCategoryMutation,
  useDeleteHSCategoryMutation,
  useGetHSAnalyticsQuery,
  useGetHSSettingsQuery,
  useUpdateHSSettingsMutation,
} = homeServicesApi;
