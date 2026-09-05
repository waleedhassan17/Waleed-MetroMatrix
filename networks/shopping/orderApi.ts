// ============================================
// Shopping Module - Order API (real backend)
// One checkout = one OrderGroup → N per-brand Orders.
// The group-typed functions are the only surface: the parallel set of
// Order-typed "legacy" wrappers that flattened a group had no call sites left.
// ============================================

import type {
  Order,
  OrderGroupView,
  OrderTrackingView,
  ReturnRequestView,
  ShippingAddress,
  SavedAddressView,
  PaginatedResponse,
  SingleResponse,
} from "../../types/shopping";
import ShoppingAxiosInstance, { extractShoppingError } from "./shoppingAxios";

// Cart + coupon functions live in cartApi; re-exported for compatibility.
export {
  fetchCartApi,
  addToCartApi,
  updateCartItemApi,
  removeCartItemApi,
  clearCartApi,
  applyCouponApi,
  removeCouponApi,
  fetchCouponsApi,
} from "./cartApi";

// ── Checkout ────────────────────────────────

export interface CheckoutPayload {
  addressId?: string;
  shippingAddress?: ShippingAddress;
  paymentMethod: "wallet" | "cod";
  deliveryOptionId?: string;
}

// POST /checkout → full group view (preferred)
export const checkoutApi = async (
  payload: CheckoutPayload
): Promise<SingleResponse<OrderGroupView>> => {
  try {
    const res = await ShoppingAxiosInstance.post("/checkout", payload);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Checkout failed"));
  }
};

// ── My Orders ───────────────────────────────

// GET /orders → order groups (preferred)
export const fetchOrderGroupsApi = async ({
  page = 1,
  limit = 20,
  status,
}: { page?: number; limit?: number; status?: string } = {}): Promise<
  PaginatedResponse<OrderGroupView>
> => {
  try {
    const res = await ShoppingAxiosInstance.get("/orders", {
      params: { page, limit, status },
    });
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load orders"));
  }
};

// GET /orders/:id (accepts groupId or child orderId) → group view
export const fetchOrderGroupByIdApi = async (
  id: string
): Promise<SingleResponse<OrderGroupView>> => {
  try {
    const res = await ShoppingAxiosInstance.get(`/orders/${id}`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load order"));
  }
};

// GET /orders/:orderId/tracking
export const fetchOrderTrackingApi = async (
  orderId: string
): Promise<SingleResponse<OrderTrackingView>> => {
  try {
    const res = await ShoppingAxiosInstance.get(`/orders/${orderId}/tracking`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load tracking"));
  }
};

// POST /orders/:orderId/cancel — cancels ONE per-brand child order
export const cancelOrderApi = async (
  orderId: string,
  reason?: string
): Promise<SingleResponse<Order>> => {
  try {
    const res = await ShoppingAxiosInstance.post(`/orders/${orderId}/cancel`, { reason });
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to cancel order"));
  }
};

// POST /orders/:orderId/return
export const requestReturnApi = async (
  orderId: string,
  payload: { items?: { itemId: string }[]; reason: string; images?: string[] }
): Promise<SingleResponse<ReturnRequestView>> => {
  try {
    const res = await ShoppingAxiosInstance.post(`/orders/${orderId}/return`, payload);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to request return"));
  }
};

// ── Saved Addresses ─────────────────────────

export const fetchAddressesApi = async (): Promise<{
  success: boolean;
  data: SavedAddressView[];
}> => {
  try {
    const res = await ShoppingAxiosInstance.get("/addresses");
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load addresses"));
  }
};

export const createAddressApi = async (
  payload: Partial<SavedAddressView>
): Promise<SingleResponse<SavedAddressView>> => {
  try {
    const res = await ShoppingAxiosInstance.post("/addresses", payload);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to save address"));
  }
};

export const updateAddressApi = async (
  addressId: string,
  payload: Partial<SavedAddressView>
): Promise<SingleResponse<SavedAddressView>> => {
  try {
    const res = await ShoppingAxiosInstance.patch(`/addresses/${addressId}`, payload);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to update address"));
  }
};

export const deleteAddressApi = async (
  addressId: string
): Promise<{ success: boolean }> => {
  try {
    const res = await ShoppingAxiosInstance.delete(`/addresses/${addressId}`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to delete address"));
  }
};

// NOTE: no updateOrderStatusApi here. It duplicated vendorApi's
// updateVendorOrderStatusApi over the same PATCH /vendor/orders/:id/status,
// and only the vendorApi one was ever called.
