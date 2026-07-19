// ============================================
// Shopping Module - Order API (real backend)
// One checkout = one OrderGroup → N per-brand Orders.
// Legacy Order-typed functions flatten the group via the serializer;
// group-typed functions are the preferred surface for new screens.
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
import { flattenOrderGroup } from "../../serializers/shopping/orderSerializer";

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

// Legacy signature — flattens the group into a single Order summary
export const createOrderApi = async (payload: {
  shippingAddress: ShippingAddress;
  paymentMethod: string;
}): Promise<SingleResponse<Order>> => {
  const res = await checkoutApi({
    shippingAddress: payload.shippingAddress,
    paymentMethod: payload.paymentMethod === "COD" ? "cod" : (payload.paymentMethod as "wallet" | "cod"),
  });
  return { success: res.success, data: flattenOrderGroup(res.data) };
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

// Legacy signature — flattened
export const fetchOrdersApi = async (params: {
  page?: number;
  limit?: number;
  status?: string;
} = {}): Promise<PaginatedResponse<Order>> => {
  const res = await fetchOrderGroupsApi(params);
  return { ...res, data: res.data.map(flattenOrderGroup) };
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

// Legacy signature — flattened
export const fetchOrderByIdApi = async (
  orderId: string
): Promise<SingleResponse<Order>> => {
  const res = await fetchOrderGroupByIdApi(orderId);
  return { success: res.success, data: flattenOrderGroup(res.data) };
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

// ── Brand Owner: Update Order Status ────────

export const updateOrderStatusApi = async (
  orderId: string,
  payload: { orderStatus: string; trackingNumber?: string; note?: string }
): Promise<SingleResponse<Order>> => {
  try {
    const res = await ShoppingAxiosInstance.patch(`/vendor/orders/${orderId}/status`, {
      status: payload.orderStatus,
      trackingNumber: payload.trackingNumber,
      note: payload.note,
    });
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to update order status"));
  }
};
