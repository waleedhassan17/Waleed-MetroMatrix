// ============================================================================
// Shopping in the admin console (/api/shopping/admin/{dashboard,analytics,
// settings,orders,brands,outlets,banners,products}).
//
// On the admin data layer, over the typed client: paths and methods are
// checked against the contract, and the admin token and envelope come with
// it. Response shapes are declared here from the controllers
// (modules/shopping/controllers/admin*Controller.js). Shopping records carry
// their own ids (orderId, brandId, outletId, bannerId, productId); every one
// also gets `id`, which the console keys lists by.
//
// The platform takes no share of an order: what a customer pays goes to the
// brand. "Order value" is the money customers spent, never platform income.
// ============================================================================

import { adminApi, nextPageParam, type AdminError, type Page, type PageParam } from './adminApi';
import { adminApi as http, type ListMeta } from './client';
import { toAdminApiError } from './errors';

export type BrandStatus = 'pending' | 'active' | 'suspended';

export interface ShopBrandPolicies {
  returnDays?: number;
  shippingInfo?: string;
  paymentMethods?: string[];
}

export interface ShopBrand {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  logo?: string;
  bannerImage?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  categories?: string[];
  policies?: ShopBrandPolicies;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  socialLinks?: { facebook?: string; instagram?: string; twitter?: string };
  status: BrandStatus;
  /** The vendor who owns it (an id in lists, filled in on the detail); null for a brand the platform runs. */
  owner?: string | { _id?: string; fullName?: string; email?: string } | null;
  ownerName?: string;
  ownerEmail?: string;
  productCount?: number;
  orderCount?: number;
  /** Order value delivered for the brand (money customers paid it). */
  revenue?: number;
  createdAt?: string;
}

/** What the brand form sends. Empty colours are left out: the server has defaults. */
export type BrandPayload = Partial<
  Pick<
    ShopBrand,
    | 'name'
    | 'tagline'
    | 'description'
    | 'logo'
    | 'bannerImage'
    | 'primaryColor'
    | 'secondaryColor'
    | 'accentColor'
    | 'categories'
    | 'policies'
    | 'contactEmail'
    | 'contactPhone'
    | 'website'
    | 'socialLinks'
  >
> & { slug?: string; isActive?: boolean };

export interface ShopOrderItem {
  itemId: string;
  productName: string;
  variantLabel?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice: number;
}

export interface ShopStatusEntry {
  status: string;
  changedAt: string;
  note?: string;
  changedBy?: { role?: string } | null;
}

export interface ShopOrder {
  id: string;
  orderId: string;
  odexId: string;
  brandId?: string | { _id?: string; name?: string } | null;
  brandName?: string;
  /** The vendor behind the brand (null when the platform runs it). */
  brandOwnerId?: string | null;
  userId?: string | null;
  customerName?: string;
  customerEmail?: string;
  items: ShopOrderItem[];
  orderStatus: string;
  paymentStatus: string;
  paymentMethod?: string;
  subtotal?: number;
  shippingFee?: number;
  discount?: number;
  total: number;
  statusHistory?: ShopStatusEntry[];
  group?: { orders: Omit<ShopOrder, 'id' | 'group'>[] } | null;
  shippingAddress?: { fullName?: string; phone?: string; addressLine1?: string; city?: string } | null;
  createdAt: string;
}

export interface ShopColorScheme {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  headerBg?: string;
  textOnHeader?: string;
}

export interface ShopOutletLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface ShopOutlet {
  id: string;
  outletId: string;
  name: string;
  slug: string;
  description?: string;
  brandId?: string | null;
  brandName?: string;
  colorScheme?: ShopColorScheme;
  location?: ShopOutletLocation;
  phone?: string;
  email?: string;
  openingHours?: string;
  managerName?: string;
  isActive: boolean;
  createdAt?: string;
}

export type OutletPayload = Partial<
  Pick<ShopOutlet, 'name' | 'description' | 'phone' | 'email' | 'openingHours' | 'managerName' | 'isActive' | 'colorScheme' | 'location'>
> & { slug?: string; brandId?: string | null };

export interface ShopBanner {
  id: string;
  bannerId: string;
  title: string;
  subtitle?: string;
  image: string;
  brandId?: string | null;
  productId?: string | null;
  sortOrder: number;
  isActive: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
}

export type BannerPayload = Partial<Pick<ShopBanner, 'title' | 'subtitle' | 'image' | 'brandId' | 'sortOrder' | 'isActive'>>;

export interface ShopDashboard {
  pendingBrandApprovals: number;
  ordersToday: number;
  /** Order value customers paid today. */
  gmvToday: number;
  openReturnRequests: number;
  lowStockAlerts: number;
}

export interface ShopAnalytics {
  gmv: number;
  gmvSeries: { label: string; gmv: number; orders: number }[];
  revenueByBrand: { brandId: string; brandName: string; ownerId?: string | null; revenue: number; orders: number }[];
  ordersByStatus: Record<string, number>;
  totalOrders: number;
  newCustomers: number;
  activeBrands: number;
  avgOrderValue: number;
  returnRate: number | null;
  topProducts: { productId: string; name: string; unitsSold: number; revenue: number; image?: string }[];
  from: string;
  to: string;
}

export interface ShopDeliveryTier {
  id: string;
  name: string;
  eta: string;
  description: string;
  surcharge: number;
  isActive: boolean;
}

// There is no commission: brands are paid the full order value.
export interface ShopSettings {
  shippingFeePerBrand: number;
  freeShippingThreshold: number;
  lowStockThreshold: number;
  defaultReturnDays: number;
  autoApproveBrands: boolean;
  /** false: new and edited products wait in Product moderation. */
  autoApproveProducts?: boolean;
  deliveryTiers: ShopDeliveryTier[];
}

export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'removed';

export interface ShopProduct {
  id: string;
  productId: string;
  name: string;
  description?: string;
  brandName?: string;
  brandId?: string;
  basePrice?: number;
  salePrice?: number | null;
  images?: string[];
  isActive?: boolean;
  moderation?: { status: ModerationStatus; note?: string; reviewedAt?: string | null } | null;
  createdAt?: string;
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

/** A shopping record's own id field. A banner or outlet also carries the brandId it links to, so it is never guessed. */
export type IdKey = 'orderId' | 'brandId' | 'outletId' | 'bannerId' | 'productId';

/** The record's own id (`key`) as `id`. */
export const withId = <T>(record: unknown, key: IdKey): T => {
  const r = (record ?? {}) as Record<string, unknown>;
  return { ...(record as object), id: String(r[key] ?? r.id ?? r._id ?? '') } as T;
};
const asPage = <T>(res: { data: unknown; meta?: ListMeta }, key: IdKey): Page<T> => {
  const items = Array.isArray(res.data) ? res.data.map((x) => withId<T>(x, key)) : [];
  return { items, meta: res.meta ?? { limit: items.length } };
};

type Q = Record<string, string | number | boolean | null | undefined>;
const FIRST_PAGE: PageParam = { page: 1 };
const PAGE_SIZE = 20;

const shoppingApi = adminApi
  .enhanceEndpoints({ addTagTypes: ['ShopDashboard', 'ShopOrder', 'ShopBrand', 'ShopOutlet', 'ShopBanner', 'ShopSettings', 'ShopProduct'] })
  .injectEndpoints({
    endpoints: (build) => ({
      // ── Overview ────────────────────────────────────────────────────────
      getShopDashboard: build.query<ShopDashboard, void>({
        queryFn: () => run(async () => (await http.get('/api/shopping/admin/dashboard')).data as unknown as ShopDashboard),
        providesTags: ['ShopDashboard'],
      }),
      getShopAnalytics: build.query<ShopAnalytics, { from: string; to: string }>({
        queryFn: (range) => run(async () => (await http.get('/api/shopping/admin/analytics', { query: range })).data as unknown as ShopAnalytics),
      }),

      // ── Settings ────────────────────────────────────────────────────────
      getShopSettings: build.query<ShopSettings, void>({
        queryFn: () => run(async () => (await http.get('/api/shopping/admin/settings')).data as unknown as ShopSettings),
        providesTags: ['ShopSettings'],
      }),
      updateShopSettings: build.mutation<ShopSettings, Partial<ShopSettings> & { reason?: string }>({
        queryFn: (body) => run(async () => (await http.patch('/api/shopping/admin/settings', { body })).data as unknown as ShopSettings),
        invalidatesTags: ['ShopSettings'],
      }),

      // ── Orders ──────────────────────────────────────────────────────────
      listShopOrders: build.infiniteQuery<Page<ShopOrder>, { status?: string; paymentStatus?: string; search?: string; brandId?: string }, PageParam>({
        infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
        queryFn: ({ queryArg, pageParam }) =>
          run(async () => asPage<ShopOrder>(await http.get('/api/shopping/admin/orders', { query: { ...(queryArg as Q), ...pageParam, limit: PAGE_SIZE } }), 'orderId')),
        providesTags: ['ShopOrder'],
      }),
      getShopOrder: build.query<ShopOrder, string>({
        queryFn: (orderId) => run(async () => withId<ShopOrder>((await http.get('/api/shopping/admin/orders/{orderId}', { params: { orderId } })).data, 'orderId')),
        providesTags: (_r, _e, id) => [{ type: 'ShopOrder', id }],
      }),
      forceShopOrderStatus: build.mutation<unknown, { id: string; status: string; reason: string }>({
        queryFn: ({ id, status, reason }) => run(async () => (await http.patch('/api/shopping/admin/orders/{orderId}/status', { params: { orderId: id }, body: { status, reason } })).data),
        invalidatesTags: (_r, _e, { id }) => [{ type: 'ShopOrder', id }, 'ShopOrder', 'ShopDashboard', 'Overview'],
      }),
      refundShopOrder: build.mutation<unknown, { id: string; reason: string }>({
        queryFn: ({ id, reason }) => run(async () => (await http.post('/api/shopping/admin/orders/{orderId}/refund', { params: { orderId: id }, body: { reason } })).data),
        invalidatesTags: (_r, _e, { id }) => [{ type: 'ShopOrder', id }, 'ShopOrder'],
      }),

      // ── Brands ──────────────────────────────────────────────────────────
      listShopBrands: build.infiniteQuery<Page<ShopBrand>, { status?: string; search?: string }, PageParam>({
        infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
        queryFn: ({ queryArg, pageParam }) =>
          run(async () => asPage<ShopBrand>(await http.get('/api/shopping/admin/brands', { query: { ...(queryArg as Q), ...pageParam, limit: PAGE_SIZE } }), 'brandId')),
        providesTags: ['ShopBrand'],
      }),
      /** Brands to link an outlet or banner to: the first hundred live ones. */
      listShopBrandOptions: build.query<ShopBrand[], void>({
        queryFn: () =>
          run(async () => asPage<ShopBrand>(await http.get('/api/shopping/admin/brands', { query: { status: 'active', page: 1, limit: 100 } }), 'brandId').items),
        providesTags: ['ShopBrand'],
      }),
      getShopBrand: build.query<ShopBrand, string>({
        queryFn: (brandId) => run(async () => withId<ShopBrand>((await http.get('/api/shopping/admin/brands/{brandId}', { params: { brandId } })).data, 'brandId')),
        providesTags: (_r, _e, id) => [{ type: 'ShopBrand', id }],
      }),
      createShopBrand: build.mutation<ShopBrand, BrandPayload>({
        queryFn: (body) => run(async () => withId<ShopBrand>((await http.post('/api/shopping/admin/brands', { body })).data, 'brandId')),
        invalidatesTags: ['ShopBrand', 'ShopDashboard'],
      }),
      updateShopBrand: build.mutation<ShopBrand, BrandPayload & { id: string }>({
        queryFn: ({ id, ...body }) => run(async () => withId<ShopBrand>((await http.patch('/api/shopping/admin/brands/{brandId}', { params: { brandId: id }, body })).data, 'brandId')),
        invalidatesTags: (_r, _e, { id }) => [{ type: 'ShopBrand', id }, 'ShopBrand'],
      }),
      setShopBrandStatus: build.mutation<unknown, { id: string; status: BrandStatus; reason: string }>({
        queryFn: ({ id, status, reason }) =>
          run(async () => (await http.patch('/api/shopping/admin/brands/{brandId}/status', { params: { brandId: id }, body: { status, reason } })).data),
        invalidatesTags: (_r, _e, { id }) => [{ type: 'ShopBrand', id }, 'ShopBrand', 'ShopDashboard', 'Queue', 'Overview'],
      }),
      deleteShopBrand: build.mutation<unknown, { id: string; reason: string }>({
        queryFn: ({ id, reason }) => run(async () => (await http.delete('/api/shopping/admin/brands/{brandId}', { params: { brandId: id }, body: { reason } })).data),
        invalidatesTags: ['ShopBrand', 'ShopOutlet', 'ShopDashboard', 'Queue', 'Overview'],
      }),

      // ── Outlets ─────────────────────────────────────────────────────────
      listShopOutlets: build.infiniteQuery<Page<ShopOutlet>, { brandId?: string }, PageParam>({
        infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
        queryFn: ({ queryArg, pageParam }) =>
          run(async () => asPage<ShopOutlet>(await http.get('/api/shopping/admin/outlets', { query: { ...(queryArg as Q), ...pageParam, limit: PAGE_SIZE } }), 'outletId')),
        providesTags: ['ShopOutlet'],
      }),
      getShopOutlet: build.query<ShopOutlet, string>({
        queryFn: (outletId) => run(async () => withId<ShopOutlet>((await http.get('/api/shopping/admin/outlets/{outletId}', { params: { outletId } })).data, 'outletId')),
        providesTags: (_r, _e, id) => [{ type: 'ShopOutlet', id }],
      }),
      createShopOutlet: build.mutation<ShopOutlet, OutletPayload>({
        queryFn: (body) => run(async () => withId<ShopOutlet>((await http.post('/api/shopping/admin/outlets', { body })).data, 'outletId')),
        invalidatesTags: ['ShopOutlet'],
      }),
      updateShopOutlet: build.mutation<ShopOutlet, OutletPayload & { id: string }>({
        queryFn: ({ id, ...body }) => run(async () => withId<ShopOutlet>((await http.put('/api/shopping/admin/outlets/{outletId}', { params: { outletId: id }, body })).data, 'outletId')),
        invalidatesTags: (_r, _e, { id }) => [{ type: 'ShopOutlet', id }, 'ShopOutlet'],
      }),
      deleteShopOutlet: build.mutation<unknown, { id: string }>({
        queryFn: ({ id }) => run(async () => (await http.delete('/api/shopping/admin/outlets/{outletId}', { params: { outletId: id } })).data),
        invalidatesTags: ['ShopOutlet'],
      }),
      assignShopOutletBrand: build.mutation<ShopOutlet, { id: string; brandId: string | null }>({
        queryFn: ({ id, brandId }) =>
          run(async () => withId<ShopOutlet>((await http.patch('/api/shopping/admin/outlets/{outletId}/assign-brand', { params: { outletId: id }, body: { brandId } })).data, 'outletId')),
        invalidatesTags: (_r, _e, { id }) => [{ type: 'ShopOutlet', id }, 'ShopOutlet'],
      }),
      setShopOutletColors: build.mutation<ShopOutlet, { id: string; colorScheme: ShopColorScheme }>({
        queryFn: ({ id, colorScheme }) =>
          run(async () => withId<ShopOutlet>((await http.patch('/api/shopping/admin/outlets/{outletId}/color-scheme', { params: { outletId: id }, body: { colorScheme } })).data, 'outletId')),
        invalidatesTags: (_r, _e, { id }) => [{ type: 'ShopOutlet', id }, 'ShopOutlet'],
      }),
      toggleShopOutlet: build.mutation<ShopOutlet, { id: string }>({
        queryFn: ({ id }) => run(async () => withId<ShopOutlet>((await http.patch('/api/shopping/admin/outlets/{outletId}/toggle-status', { params: { outletId: id } })).data, 'outletId')),
        invalidatesTags: (_r, _e, { id }) => [{ type: 'ShopOutlet', id }, 'ShopOutlet'],
      }),

      // ── Banners ─────────────────────────────────────────────────────────
      listShopBanners: build.infiniteQuery<Page<ShopBanner>, void, PageParam>({
        infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
        queryFn: ({ pageParam }) =>
          run(async () => asPage<ShopBanner>(await http.get('/api/shopping/admin/banners', { query: { ...pageParam, limit: PAGE_SIZE } }), 'bannerId')),
        providesTags: ['ShopBanner'],
      }),
      saveShopBanner: build.mutation<ShopBanner, BannerPayload & { id?: string }>({
        queryFn: ({ id, ...body }) =>
          run(async () =>
            withId<ShopBanner>(
              id
                ? (await http.patch('/api/shopping/admin/banners/{bannerId}', { params: { bannerId: id }, body })).data
                : (await http.post('/api/shopping/admin/banners', { body })).data,
              'bannerId'
            )
          ),
        invalidatesTags: ['ShopBanner'],
      }),
      deleteShopBanner: build.mutation<unknown, { id: string }>({
        queryFn: ({ id }) => run(async () => (await http.delete('/api/shopping/admin/banners/{bannerId}', { params: { bannerId: id } })).data),
        invalidatesTags: ['ShopBanner'],
      }),

      // ── Product moderation ──────────────────────────────────────────────
      listShopProducts: build.infiniteQuery<Page<ShopProduct>, { moderationStatus?: string; search?: string }, PageParam>({
        infiniteQueryOptions: { initialPageParam: FIRST_PAGE, getNextPageParam: (last) => nextPageParam(last) },
        queryFn: ({ queryArg, pageParam }) =>
          run(async () => asPage<ShopProduct>(await http.get('/api/shopping/admin/products', { query: { ...(queryArg as Q), ...pageParam, limit: PAGE_SIZE } }), 'productId')),
        providesTags: ['ShopProduct'],
      }),
      moderateShopProduct: build.mutation<unknown, { id: string; status: 'approved' | 'rejected' | 'removed'; note?: string }>({
        queryFn: ({ id, status, note }) =>
          run(async () => (await http.patch('/api/shopping/admin/products/{productId}/moderation', { params: { productId: id }, body: { status, note } })).data),
        invalidatesTags: ['ShopProduct', 'Queue', 'Overview'],
      }),
    }),
  });

export const {
  useGetShopDashboardQuery,
  useGetShopAnalyticsQuery,
  useGetShopSettingsQuery,
  useUpdateShopSettingsMutation,
  useListShopOrdersInfiniteQuery,
  useGetShopOrderQuery,
  useForceShopOrderStatusMutation,
  useRefundShopOrderMutation,
  useListShopBrandsInfiniteQuery,
  useListShopBrandOptionsQuery,
  useGetShopBrandQuery,
  useCreateShopBrandMutation,
  useUpdateShopBrandMutation,
  useSetShopBrandStatusMutation,
  useDeleteShopBrandMutation,
  useListShopOutletsInfiniteQuery,
  useGetShopOutletQuery,
  useCreateShopOutletMutation,
  useUpdateShopOutletMutation,
  useDeleteShopOutletMutation,
  useAssignShopOutletBrandMutation,
  useSetShopOutletColorsMutation,
  useToggleShopOutletMutation,
  useListShopBannersInfiniteQuery,
  useSaveShopBannerMutation,
  useDeleteShopBannerMutation,
  useListShopProductsInfiniteQuery,
  useModerateShopProductMutation,
} = shoppingApi;

/** The endpoints themselves, for the end-to-end tests that drive them without screens. */
export const shoppingEndpoints = shoppingApi.endpoints;
