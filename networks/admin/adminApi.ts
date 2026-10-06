// ============================================================================
// The admin console's data layer (RTK Query).
//
// Every endpoint is a `queryFn` over the typed client (./client.ts), so the
// path, method, body and response type are all checked against the backend
// contract at compile time, and every request rides the shared axios instance
// (token attachment, refresh-on-401).
//
// What this replaces: hand-written thunks per screen, each with its own
// loading flag, its own idea of a page, and — in several screens — an initial
// state full of invented figures that showed until (or instead of) the real
// response. Here a screen gets `isLoading` / `isError` / `data`, and there is
// nothing to show until the server has answered.
//
// Lists are infinite queries: `fetchNextPage()` follows `meta.nextCursor`
// (or the next page number), items are de-duplicated by id, and a refresh
// refetches from the first page.
// ============================================================================

import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import { adminApi as http, type ListMeta, type Schemas } from './client';
import { toAdminApiError } from './errors';

/** A failed call, in a form Redux can store (AdminApiError is a class). */
export interface AdminError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export const toAdminError = (err: unknown): AdminError => {
  const e = toAdminApiError(err);
  return { status: e.status, code: e.code, message: e.message, details: e.details, requestId: e.requestId };
};

async function run<T>(fn: () => Promise<T>): Promise<{ data: T } | { error: AdminError }> {
  try {
    return { data: await fn() };
  } catch (err) {
    return { error: toAdminError(err) };
  }
}

export interface Page<T> {
  items: T[];
  meta: ListMeta;
}

/** Where the next page starts: the server's cursor, else the next page number. */
export type PageParam = { cursor?: string; page?: number };

const FIRST_PAGE: PageParam = { page: 1 };

export function nextPageParam(last: Page<unknown>): PageParam | undefined {
  const { meta } = last;
  if (meta.nextCursor) return { cursor: meta.nextCursor };
  if (meta.page && meta.pages && meta.page < meta.pages) return { page: meta.page + 1 };
  return undefined;
}

async function listPage<T>(request: Promise<{ data: T[]; meta?: ListMeta }>): Promise<Page<T>> {
  const res = await request;
  const items = Array.isArray(res.data) ? res.data : [];
  return { items, meta: res.meta ?? { limit: items.length } };
}

/** Items across loaded pages, without the duplicates a shifting list can produce. */
export function flattenPages<T extends { id: string }>(pages: Page<T>[] | undefined): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const page of pages ?? []) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export type ProviderFilters = {
  state?: string;
  type?: string;
  subType?: string;
  city?: string;
  search?: string;
  sort?: string;
  limit?: number;
};
/** `deleted` (super admins): soft-deleted accounts, to restore one. */
export type UserFilters = { status?: 'active' | 'inactive' | 'deleted'; search?: string; sort?: string; limit?: number };
export type NotificationFilters = { unread?: boolean; type?: string; limit?: number };
export type QueueFilters = { type?: string; limit?: number };

export type ConsoleMeta = Schemas['ConsoleMeta'];
export type Overview = Schemas['Overview'];
export type QueueItem = Schemas['QueueItem'];
export type ProviderSummary = Schemas['ProviderSummary'];
export type ProviderDetail = Schemas['ProviderDetail'];
export type ProviderAnalytics = Schemas['ProviderAnalytics'];
export type AnalyticsRange = ProviderAnalytics['range'];
export type UserSummary = Schemas['UserSummary'];
export type UserDetail = Schemas['UserDetail'];
export type AdminNotification = Schemas['Notification'];
export type AdminProfile = Schemas['AdminProfile'];
export type AdminSession = Schemas['Session'];
export type SettingsResponse = Schemas['SettingsResponse'];

const pageQuery = (filters: Query, param: PageParam): Query => ({ ...filters, ...param });

const TAGS = ['Meta', 'Overview', 'Queue', 'Provider', 'ProviderList', 'User', 'UserList', 'Notification', 'Settings', 'Admin', 'Session', 'Profile'] as const;

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fakeBaseQuery<AdminError>(),
  tagTypes: TAGS,
  // Admin data changes under other admins' hands; do not serve it stale for long.
  keepUnusedDataFor: 60,
  endpoints: (build) => ({
    // ── Console ─────────────────────────────────────────────────────────────
    getMeta: build.query<ConsoleMeta, void>({
      queryFn: () => run(async () => (await http.get('/api/admin/meta')).data),
      providesTags: ['Meta'],
      keepUnusedDataFor: 600,
    }),
    getOverview: build.query<Overview, void>({
      queryFn: () => run(async () => (await http.get('/api/admin/overview')).data),
      providesTags: ['Overview'],
    }),
    getQueue: build.infiniteQuery<Page<QueueItem>, QueueFilters, PageParam>({
      infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
      queryFn: ({ queryArg, pageParam }) =>
        run(() => listPage(http.get('/api/admin/queue', { query: pageQuery(queryArg, { cursor: pageParam.cursor }) }))),
      providesTags: ['Queue'],
    }),

    // ── Providers ───────────────────────────────────────────────────────────
    listProviders: build.infiniteQuery<Page<ProviderSummary>, ProviderFilters, PageParam>({
      infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
      queryFn: ({ queryArg, pageParam }) =>
        run(() => listPage(http.get('/api/admin/providers', { query: pageQuery(queryArg, pageParam) }))),
      providesTags: ['ProviderList'],
    }),
    getProvider: build.query<ProviderDetail, string>({
      queryFn: (providerId) => run(async () => (await http.get('/api/admin/providers/{providerId}', { params: { providerId } })).data),
      providesTags: (_r, _e, id) => [{ type: 'Provider', id }],
    }),
    getProviderAnalytics: build.query<ProviderAnalytics, { id: string; range: AnalyticsRange }>({
      queryFn: ({ id, range }) =>
        run(async () => (await http.get('/api/admin/providers/{providerId}/analytics', { params: { providerId: id }, query: { range } })).data),
      providesTags: (_r, _e, { id }) => [{ type: 'Provider', id }],
    }),
    approveProvider: build.mutation<ProviderDetail, { id: string; notes?: string }>({
      queryFn: ({ id, notes }) =>
        run(async () => (await http.put('/api/admin/providers/{providerId}/approve', { params: { providerId: id }, body: { notes } })).data),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Provider', id }, 'ProviderList', 'Queue', 'Overview'],
    }),
    rejectProvider: build.mutation<ProviderDetail, { id: string; reason: string; notes?: string }>({
      queryFn: ({ id, reason, notes }) =>
        run(async () => (await http.put('/api/admin/providers/{providerId}/reject', { params: { providerId: id }, body: { reason, notes } })).data),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Provider', id }, 'ProviderList', 'Queue', 'Overview'],
    }),
    suspendProvider: build.mutation<ProviderDetail, { id: string; reason: string }>({
      queryFn: ({ id, reason }) =>
        run(async () => (await http.put('/api/admin/providers/{providerId}/suspend', { params: { providerId: id }, body: { reason } })).data),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Provider', id }, 'ProviderList', 'Overview'],
    }),
    unsuspendProvider: build.mutation<ProviderDetail, { id: string }>({
      queryFn: ({ id }) =>
        run(async () => (await http.put('/api/admin/providers/{providerId}/unsuspend', { params: { providerId: id } })).data),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Provider', id }, 'ProviderList', 'Overview'],
    }),
    deleteProvider: build.mutation<Schemas['DeletionResult'], { id: string; reason: string }>({
      queryFn: ({ id, reason }) =>
        run(async () => (await http.delete('/api/admin/providers/{providerId}', { params: { providerId: id }, body: { reason } })).data),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Provider', id }, 'ProviderList', 'Queue', 'Overview'],
    }),
    restoreProvider: build.mutation<Schemas['RestoreResult'], { id: string; reason?: string }>({
      queryFn: ({ id, reason }) =>
        run(async () => (await http.post('/api/admin/providers/{providerId}/restore', { params: { providerId: id }, body: { reason } })).data),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Provider', id }, 'ProviderList', 'Overview'],
    }),

    // ── Users ───────────────────────────────────────────────────────────────
    listUsers: build.infiniteQuery<Page<UserSummary>, UserFilters, PageParam>({
      infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
      queryFn: ({ queryArg, pageParam }) =>
        run(() => listPage(http.get('/api/admin/users', { query: pageQuery(queryArg, pageParam) }))),
      providesTags: ['UserList'],
    }),
    getUser: build.query<UserDetail, string>({
      queryFn: (userId) => run(async () => (await http.get('/api/admin/users/{userId}', { params: { userId } })).data),
      providesTags: (_r, _e, id) => [{ type: 'User', id }],
    }),
    activateUser: build.mutation<UserSummary, { id: string }>({
      queryFn: ({ id }) => run(async () => (await http.put('/api/admin/users/{userId}/activate', { params: { userId: id } })).data),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'User', id }, 'UserList', 'Overview'],
    }),
    deactivateUser: build.mutation<UserSummary, { id: string; reason: string }>({
      queryFn: ({ id, reason }) =>
        run(async () => (await http.put('/api/admin/users/{userId}/deactivate', { params: { userId: id }, body: { reason } })).data),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'User', id }, 'UserList', 'Overview'],
    }),
    deleteUser: build.mutation<Schemas['DeletionResult'], { id: string; reason: string }>({
      queryFn: ({ id, reason }) =>
        run(async () => (await http.delete('/api/admin/users/{userId}', { params: { userId: id }, body: { reason } })).data),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'User', id }, 'UserList', 'Overview'],
    }),
    restoreUser: build.mutation<Schemas['RestoreResult'], { id: string; reason?: string }>({
      queryFn: ({ id, reason }) => run(async () => (await http.post('/api/admin/users/{userId}/restore', { params: { userId: id }, body: { reason } })).data),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'User', id }, 'UserList', 'Overview'],
    }),

    // ── Notifications (read state is per admin) ─────────────────────────────
    listNotifications: build.infiniteQuery<Page<AdminNotification>, NotificationFilters, PageParam>({
      infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
      queryFn: ({ queryArg, pageParam }) =>
        run(() =>
          listPage(
            http.get('/api/admin/notifications', {
              query: pageQuery({ ...queryArg, unread: queryArg.unread ? 'true' : undefined }, pageParam),
            })
          )
        ),
      providesTags: ['Notification'],
    }),
    getUnreadCount: build.query<number, void>({
      queryFn: () => run(async () => (await http.get('/api/admin/notifications/unread-count')).data.unread),
      providesTags: ['Notification'],
    }),
    markNotificationRead: build.mutation<unknown, string>({
      queryFn: (notificationId) =>
        run(async () => (await http.put('/api/admin/notifications/{notificationId}/read', { params: { notificationId } })).data),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsRead: build.mutation<unknown, void>({
      queryFn: () => run(async () => (await http.put('/api/admin/notifications/read-all')).data),
      invalidatesTags: ['Notification'],
    }),
    dismissNotification: build.mutation<unknown, string>({
      queryFn: (notificationId) =>
        run(async () => (await http.delete('/api/admin/notifications/{notificationId}', { params: { notificationId } })).data),
      invalidatesTags: ['Notification'],
    }),
    clearNotifications: build.mutation<unknown, void>({
      queryFn: () => run(async () => (await http.delete('/api/admin/notifications/clear-all')).data),
      invalidatesTags: ['Notification'],
    }),

    // ── Settings ────────────────────────────────────────────────────────────
    getSettings: build.query<SettingsResponse, void>({
      queryFn: () => run(async () => (await http.get('/api/admin/settings')).data),
      providesTags: ['Settings'],
    }),
    updateSettings: build.mutation<Schemas['SettingsUpdate'], { section: 'general' | 'notifications' | 'security' | 'finance'; values: Record<string, unknown> }>({
      queryFn: ({ section, values }) =>
        run(async () => {
          switch (section) {
            case 'general':
              return (await http.put('/api/admin/settings/general', { body: values })).data;
            case 'notifications':
              return (await http.put('/api/admin/settings/notifications', { body: values })).data;
            case 'security':
              return (await http.put('/api/admin/settings/security', { body: values })).data;
            case 'finance':
              return (await http.put('/api/admin/settings/finance', { body: values })).data;
          }
        }),
      invalidatesTags: ['Settings', 'Meta'],
    }),

    // ── Own account ─────────────────────────────────────────────────────────
    listMySessions: build.query<AdminSession[], void>({
      queryFn: () => run(async () => (await http.get('/api/admin/sessions')).data),
      providesTags: ['Session'],
    }),
    revokeMySession: build.mutation<{ revoked: boolean; current: boolean }, string>({
      queryFn: (sessionId) => run(async () => (await http.delete('/api/admin/sessions/{sessionId}', { params: { sessionId } })).data),
      invalidatesTags: ['Session'],
    }),
    updateMyProfile: build.mutation<AdminProfile, { fullName?: string; email?: string; currentPassword?: string }>({
      queryFn: (body) => run(async () => (await http.put('/api/admin/profile', { body })).data),
      invalidatesTags: ['Profile', 'Meta'],
    }),

    // ── Admin management (super admin) ──────────────────────────────────────
    listAdmins: build.query<AdminProfile[], void>({
      queryFn: () => run(async () => (await http.get('/api/admin/admins')).data),
      providesTags: ['Admin'],
    }),
    createAdmin: build.mutation<
      { admin: AdminProfile; temporaryPassword: string },
      { email: string; fullName: string; role: string; permissions?: Record<string, boolean> }
    >({
      queryFn: (body) => run(async () => (await http.post('/api/admin/admins', { body })).data),
      invalidatesTags: ['Admin'],
    }),
    updateAdmin: build.mutation<
      { admin: AdminProfile; sessionsSignedOut: number },
      { id: string; fullName?: string; isActive?: boolean; role?: string; permissions?: Record<string, boolean>; reason?: string }
    >({
      queryFn: ({ id, ...body }) => run(async () => (await http.patch('/api/admin/admins/{adminId}', { params: { adminId: id }, body })).data),
      invalidatesTags: ['Admin'],
    }),
    resetAdminPassword: build.mutation<{ admin: AdminProfile; temporaryPassword: string; sessionsSignedOut: number }, { id: string }>({
      queryFn: ({ id }) => run(async () => (await http.post('/api/admin/admins/{adminId}/reset-password', { params: { adminId: id } })).data),
      invalidatesTags: ['Admin'],
    }),
    resetAdminTwoFactor: build.mutation<{ twoFactorEnabled: boolean; sessionsSignedOut: number }, { id: string }>({
      queryFn: ({ id }) => run(async () => (await http.post('/api/admin/admins/{adminId}/reset-2fa', { params: { adminId: id } })).data),
      invalidatesTags: ['Admin'],
    }),
    listAdminSessions: build.query<AdminSession[], string>({
      queryFn: (adminId) => run(async () => (await http.get('/api/admin/admins/{adminId}/sessions', { params: { adminId } })).data),
      providesTags: (_r, _e, id) => [{ type: 'Session', id }],
    }),
    revokeAdminSession: build.mutation<unknown, { adminId: string; sessionId: string }>({
      queryFn: ({ adminId, sessionId }) =>
        run(async () => (await http.delete('/api/admin/admins/{adminId}/sessions/{sessionId}', { params: { adminId, sessionId } })).data),
      invalidatesTags: (_r, _e, { adminId }) => [{ type: 'Session', id: adminId }, 'Admin'],
    }),
  }),
});

export const {
  useGetMetaQuery,
  useGetOverviewQuery,
  useGetQueueInfiniteQuery,
  useListProvidersInfiniteQuery,
  useGetProviderQuery,
  useGetProviderAnalyticsQuery,
  useApproveProviderMutation,
  useRejectProviderMutation,
  useSuspendProviderMutation,
  useUnsuspendProviderMutation,
  useDeleteProviderMutation,
  useRestoreProviderMutation,
  useListUsersInfiniteQuery,
  useGetUserQuery,
  useActivateUserMutation,
  useDeactivateUserMutation,
  useDeleteUserMutation,
  useRestoreUserMutation,
  useListNotificationsInfiniteQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDismissNotificationMutation,
  useClearNotificationsMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useListMySessionsQuery,
  useRevokeMySessionMutation,
  useUpdateMyProfileMutation,
  useListAdminsQuery,
  useCreateAdminMutation,
  useUpdateAdminMutation,
  useResetAdminPasswordMutation,
  useResetAdminTwoFactorMutation,
  useListAdminSessionsQuery,
  useRevokeAdminSessionMutation,
} = adminApi;

/** The error from a query/mutation hook, as an AdminError (or null). */
export const adminErrorOf = (error: unknown): AdminError | null => {
  if (!error) return null;
  const e = error as Partial<AdminError>;
  return typeof e.code === 'string' && typeof e.message === 'string' ? (e as AdminError) : toAdminError(error);
};
