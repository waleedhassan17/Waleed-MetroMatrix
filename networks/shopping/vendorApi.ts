// ============================================
// Shopping Module - Vendor (Brand Owner) API
// All routes require an approved vendor Provider token and are scoped
// server-side to the vendor's own brand.
// ============================================

import type {
  BrandConfig,
  Coupon,
  Order,
  Product,
  ProductReview,
  ReturnRequestView,
  PaginatedResponse,
  SingleResponse,
} from "../../types/shopping";
import ShoppingAxiosInstance, { extractShoppingError } from "./shoppingAxios";

// ── Types matching the vendor screens ───────

export interface InventoryRowView {
  productId: string;
  productName: string;
  productImage: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  stockQuantity: number;
  lowStock: boolean;
  outOfStock: boolean;
}

export interface VendorDashboardView {
  kpis: {
    revenue: number;
    income: number;
    orders: number;
    products: number;
    lowStock: number;
    activeShipments: number;
    deliveryRate: number;
  };
  weeklySales: number[];
  recentOrders: {
    orderId: string;
    odexId: string;
    customerName: string;
    orderStatus: string;
    total: number;
    createdAt: string;
  }[];
  lowStockAlerts: { productId: string; name: string; stock: number }[];
}

export interface VendorAnalyticsView {
  summary: {
    totalRevenue: number;
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    totalOrders: number;
    avgOrderValue: number;
    conversionRate: number;
    returnsCount: number;
    refundsAmount: number;
  };
  revenueChart: { label: string; revenue: number; orders: number }[];
  topProducts: { productId: string; name: string; unitsSold: number; revenue: number; image?: string }[];
  categoryBreakdown: { category: string; revenue: number; percentage: number; color: string }[];
  previousPeriodRevenue: number;
}

const call = async <T>(fn: () => Promise<{ data: T }>, fallback: string): Promise<T> => {
  try {
    const res = await fn();
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, fallback));
  }
};

// ── Brand profile ───────────────────────────

export const fetchMyBrandApi = () =>
  call<SingleResponse<BrandConfig>>(
    () => ShoppingAxiosInstance.get("/vendor/brand"),
    "Failed to load your brand"
  );

export const createMyBrandApi = (payload: Partial<BrandConfig>) =>
  call<SingleResponse<BrandConfig>>(
    () => ShoppingAxiosInstance.post("/vendor/brand", payload),
    "Failed to create your brand"
  );

export const updateMyBrandApi = (payload: Partial<BrandConfig>) =>
  call<SingleResponse<BrandConfig>>(
    () => ShoppingAxiosInstance.patch("/vendor/brand", payload),
    "Failed to update your brand"
  );

export const uploadBrandLogoApi = (imageBase64: string) =>
  call<SingleResponse<BrandConfig>>(
    () => ShoppingAxiosInstance.post("/vendor/brand/logo", { image: imageBase64 }),
    "Failed to upload logo"
  );

export const uploadBrandBannerApi = (imageBase64: string) =>
  call<SingleResponse<BrandConfig>>(
    () => ShoppingAxiosInstance.post("/vendor/brand/banner", { image: imageBase64 }),
    "Failed to upload banner"
  );

// ── Products & categories ───────────────────

export const fetchMyProductsApi = (params: {
  page?: number;
  limit?: number;
  search?: string;
  stockStatus?: "in" | "low" | "out";
  includeInactive?: boolean;
} = {}) =>
  call<PaginatedResponse<Product>>(
    () => ShoppingAxiosInstance.get("/vendor/products", { params }),
    "Failed to load your products"
  );

export const fetchMyCategoriesApi = () =>
  call<{ success: boolean; data: any[] }>(
    () => ShoppingAxiosInstance.get("/vendor/categories"),
    "Failed to load categories"
  );

export const createCategoryApi = (payload: { name: string; icon?: string; parentId?: string }) =>
  call<SingleResponse<any>>(
    () => ShoppingAxiosInstance.post("/vendor/categories", payload),
    "Failed to create category"
  );

export const addProductImagesApi = (productId: string, images: string[]) =>
  call<SingleResponse<Product>>(
    () => ShoppingAxiosInstance.post(`/vendor/products/${productId}/images`, { images }),
    "Failed to upload product images"
  );

// ── Inventory ───────────────────────────────

export const fetchInventoryApi = () =>
  call<{ success: boolean; data: InventoryRowView[] }>(
    () => ShoppingAxiosInstance.get("/vendor/inventory"),
    "Failed to load inventory"
  );

export const updateStockApi = (variantId: string, stockQuantity: number, reason?: string) =>
  call<{ success: boolean }>(
    () => ShoppingAxiosInstance.patch(`/vendor/inventory/${variantId}`, { stockQuantity, reason }),
    "Failed to update stock"
  );

export const bulkUpdateStockApi = (
  updates: { variantId: string; stockQuantity: number; reason?: string }[]
) =>
  call<{ success: boolean; data: any[] }>(
    () => ShoppingAxiosInstance.post("/vendor/inventory/bulk", { updates }),
    "Failed to update stock"
  );

// ── Orders & returns ────────────────────────

export const fetchVendorOrdersApi = (params: { page?: number; limit?: number; status?: string } = {}) =>
  call<PaginatedResponse<Order & { customerName?: string }>>(
    () => ShoppingAxiosInstance.get("/vendor/orders", { params }),
    "Failed to load orders"
  );

export const fetchVendorOrderApi = (orderId: string) =>
  call<SingleResponse<Order & { customerName?: string; customerEmail?: string; statusHistory?: any[] }>>(
    () => ShoppingAxiosInstance.get(`/vendor/orders/${orderId}`),
    "Failed to load order"
  );

export const updateVendorOrderStatusApi = (
  orderId: string,
  payload: { status: string; note?: string; trackingNumber?: string }
) =>
  call<SingleResponse<Order>>(
    () => ShoppingAxiosInstance.patch(`/vendor/orders/${orderId}/status`, payload),
    "Failed to update order status"
  );

export const fetchVendorReturnsApi = (params: { page?: number; limit?: number; status?: string } = {}) =>
  call<PaginatedResponse<ReturnRequestView>>(
    () => ShoppingAxiosInstance.get("/vendor/returns", { params }),
    "Failed to load return requests"
  );

export const updateVendorReturnApi = (
  returnId: string,
  payload: { status: string; vendorNote?: string }
) =>
  call<SingleResponse<ReturnRequestView>>(
    () => ShoppingAxiosInstance.patch(`/vendor/returns/${returnId}`, payload),
    "Failed to update return request"
  );

// ── Coupons ─────────────────────────────────

export const fetchVendorCouponsApi = () =>
  call<{ success: boolean; data: Coupon[] }>(
    () => ShoppingAxiosInstance.get("/vendor/coupons"),
    "Failed to load coupons"
  );

export const createVendorCouponApi = (payload: Partial<Coupon>) =>
  call<SingleResponse<Coupon>>(
    () => ShoppingAxiosInstance.post("/vendor/coupons", payload),
    "Failed to create coupon"
  );

export const updateVendorCouponApi = (
  couponCode: string,
  payload: Partial<Coupon> & { isActive?: boolean }
) =>
  call<SingleResponse<Coupon>>(
    () => ShoppingAxiosInstance.patch(`/vendor/coupons/${couponCode}`, payload),
    "Failed to update coupon"
  );

// ── Reviews ─────────────────────────────────

export const fetchVendorReviewsApi = (params: { page?: number; limit?: number; rating?: number } = {}) =>
  call<PaginatedResponse<ProductReview & { productName?: string; productImage?: string; vendorResponse?: string }>>(
    () => ShoppingAxiosInstance.get("/vendor/reviews", { params }),
    "Failed to load reviews"
  );

export const respondToReviewApi = (reviewId: string, response: string) =>
  call<SingleResponse<ProductReview>>(
    () => ShoppingAxiosInstance.post(`/vendor/reviews/${reviewId}/respond`, { response }),
    "Failed to send response"
  );

// ── Analytics & dashboard ───────────────────

export const fetchVendorAnalyticsApi = (params: { period?: string; from?: string; to?: string } = {}) =>
  call<SingleResponse<VendorAnalyticsView>>(
    () => ShoppingAxiosInstance.get("/vendor/analytics", { params }),
    "Failed to load analytics"
  );

export const fetchVendorDashboardApi = () =>
  call<SingleResponse<VendorDashboardView>>(
    () => ShoppingAxiosInstance.get("/vendor/dashboard"),
    "Failed to load dashboard"
  );
