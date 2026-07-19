// ============================================
// Shopping Module - Admin API
// Brand oversight, order oversight, platform analytics, settings.
// Requires an admin token with the shopping permission.
// ============================================

import type {
  BrandConfig,
  Order,
  OrderGroupView,
  PaginatedResponse,
  SingleResponse,
} from "../../types/shopping";
import ShoppingAxiosInstance, { extractShoppingError } from "./shoppingAxios";

export interface AdminBrandView extends BrandConfig {
  status: "pending" | "active" | "suspended";
  ownerName?: string;
  ownerEmail?: string;
  productCount?: number;
  orderCount?: number;
  revenue?: number;
}

export interface AdminOrderView extends Order {
  brandName?: string;
  customerName?: string;
  customerEmail?: string;
  statusHistory?: { status: string; changedAt: string; note?: string; changedBy?: any }[];
  group?: OrderGroupView & { orders: (Order & { statusHistory?: any[] })[] };
}

export interface ShoppingSettingsView {
  commissionPercent: number;
  shippingFeePerBrand: number;
  freeShippingThreshold: number;
  lowStockThreshold: number;
  defaultReturnDays: number;
  autoApproveBrands: boolean;
}

export interface AdminDashboardView {
  pendingBrandApprovals: number;
  ordersToday: number;
  gmvToday: number;
  openReturnRequests: number;
  lowStockAlerts: number;
}

export interface AdminAnalyticsView {
  gmv: number;
  gmvSeries: { label: string; gmv: number; orders: number }[];
  revenueByBrand: { brandId: string; brandName: string; revenue: number; orders: number }[];
  commission: number;
  ordersByStatus: Record<string, number>;
  totalOrders: number;
  newCustomers: number;
  activeBrands: number;
  avgOrderValue: number;
  returnRate: number;
  topProducts: { productId: string; name: string; unitsSold: number; revenue: number; image?: string }[];
  from: string;
  to: string;
}

const call = async <T>(fn: () => Promise<{ data: T }>, fallback: string): Promise<T> => {
  try {
    const res = await fn();
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, fallback));
  }
};

// ── Brand oversight ─────────────────────────

export const fetchAdminBrandsApi = (params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
} = {}) =>
  call<PaginatedResponse<AdminBrandView>>(
    () => ShoppingAxiosInstance.get("/admin/brands", { params }),
    "Failed to load brands"
  );

export const fetchAdminBrandDetailApi = (brandId: string) =>
  call<SingleResponse<AdminBrandView>>(
    () => ShoppingAxiosInstance.get(`/admin/brands/${brandId}`),
    "Failed to load brand"
  );

export const setBrandStatusApi = (
  brandId: string,
  status: "active" | "suspended" | "pending",
  reason?: string
) =>
  call<SingleResponse<AdminBrandView>>(
    () => ShoppingAxiosInstance.patch(`/admin/brands/${brandId}/status`, { status, reason }),
    "Failed to update brand status"
  );

// ── Order oversight ─────────────────────────

export const fetchAdminOrdersApi = (params: {
  page?: number;
  limit?: number;
  brandId?: string;
  status?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
  search?: string;
} = {}) =>
  call<PaginatedResponse<AdminOrderView>>(
    () => ShoppingAxiosInstance.get("/admin/orders", { params }),
    "Failed to load orders"
  );

export const fetchAdminOrderDetailApi = (orderId: string) =>
  call<SingleResponse<AdminOrderView>>(
    () => ShoppingAxiosInstance.get(`/admin/orders/${orderId}`),
    "Failed to load order"
  );

export const forceOrderStatusApi = (orderId: string, status: string, reason: string) =>
  call<SingleResponse<Order>>(
    () => ShoppingAxiosInstance.patch(`/admin/orders/${orderId}/status`, { status, reason }),
    "Failed to change order status"
  );

export const adminRefundOrderApi = (orderId: string, reason: string) =>
  call<SingleResponse<Order>>(
    () => ShoppingAxiosInstance.post(`/admin/orders/${orderId}/refund`, { reason }),
    "Failed to refund order"
  );

// ── Analytics, dashboard, settings ──────────

export const fetchAdminAnalyticsApi = (params: { from?: string; to?: string } = {}) =>
  call<SingleResponse<AdminAnalyticsView>>(
    () => ShoppingAxiosInstance.get("/admin/analytics", { params }),
    "Failed to load analytics"
  );

export const fetchAdminDashboardApi = () =>
  call<SingleResponse<AdminDashboardView>>(
    () => ShoppingAxiosInstance.get("/admin/dashboard"),
    "Failed to load dashboard"
  );

export const fetchShoppingSettingsApi = () =>
  call<SingleResponse<ShoppingSettingsView>>(
    () => ShoppingAxiosInstance.get("/admin/settings"),
    "Failed to load settings"
  );

export const updateShoppingSettingsApi = (payload: Partial<ShoppingSettingsView>) =>
  call<SingleResponse<ShoppingSettingsView>>(
    () => ShoppingAxiosInstance.patch("/admin/settings", payload),
    "Failed to update settings"
  );
