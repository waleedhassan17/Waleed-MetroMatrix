// ============================================
// Shopping Module - Cart & Coupon API (real backend)
// The server owns the cart: totals are always recomputed server-side.
// ============================================

import type { Cart, CartItem, Coupon, SingleResponse } from "../../types/shopping";
import ShoppingAxiosInstance, { extractShoppingError } from "./shoppingAxios";

/** Cart items come back with extra display fields for the cart screen. */
export interface CartItemView extends CartItem {
  brandName: string;
  productName: string;
  productImage: string;
  size?: string;
  color?: string;
  colorCode?: string;
}

/**
 * Per-brand money rows, computed server-side from the same settings checkout
 * uses. The cart screen used to derive these from its own hardcoded fee and
 * threshold, which could disagree with the order summary below them.
 */
export interface CartBrandRow {
  brandId: string;
  brandName: string;
  subtotal: number;
  shippingFee: number;
}

export interface CartView extends Omit<Cart, "items"> {
  items: CartItemView[];
  brandBreakdown: CartBrandRow[];
}

/** A delivery speed tier offered at checkout. `cost` is the surcharge. */
export interface DeliveryOptionView {
  id: string;
  name: string;
  eta: string;
  description: string;
  cost: number;
}

// GET /delivery-options — tiers and their prices come from admin settings, and
// the id chosen here is what POST /checkout actually charges for.
export const fetchDeliveryOptionsApi = async (): Promise<{
  success: boolean;
  data: DeliveryOptionView[];
}> => {
  try {
    const res = await ShoppingAxiosInstance.get("/delivery-options");
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load delivery options"));
  }
};

// GET /cart
export const fetchCartApi = async (): Promise<SingleResponse<CartView>> => {
  try {
    const res = await ShoppingAxiosInstance.get("/cart");
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load cart"));
  }
};

// POST /cart/items
export const addToCartApi = async (payload: {
  productId: string;
  brandId?: string; // derived server-side; accepted for signature compatibility
  variantId: string;
  quantity: number;
}): Promise<SingleResponse<CartView>> => {
  try {
    const res = await ShoppingAxiosInstance.post("/cart/items", {
      productId: payload.productId,
      variantId: payload.variantId,
      quantity: payload.quantity,
    });
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to add item to cart"));
  }
};

// PATCH /cart/items/:itemId
export const updateCartItemApi = async (
  itemId: string,
  quantity: number
): Promise<SingleResponse<CartView>> => {
  try {
    const res = await ShoppingAxiosInstance.patch(`/cart/items/${itemId}`, { quantity });
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to update cart item"));
  }
};

// DELETE /cart/items/:itemId
export const removeCartItemApi = async (
  itemId: string
): Promise<SingleResponse<CartView>> => {
  try {
    const res = await ShoppingAxiosInstance.delete(`/cart/items/${itemId}`);
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to remove cart item"));
  }
};

// DELETE /cart
export const clearCartApi = async (): Promise<{ success: boolean }> => {
  try {
    const res = await ShoppingAxiosInstance.delete("/cart");
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to clear cart"));
  }
};

// POST /cart/coupon
export const applyCouponApi = async (
  couponCode: string
): Promise<SingleResponse<CartView>> => {
  try {
    const res = await ShoppingAxiosInstance.post("/cart/coupon", { couponCode });
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to apply coupon"));
  }
};

// DELETE /cart/coupon
export const removeCouponApi = async (): Promise<SingleResponse<CartView>> => {
  try {
    const res = await ShoppingAxiosInstance.delete("/cart/coupon");
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to remove coupon"));
  }
};

// GET /coupons?brandId
export const fetchCouponsApi = async (
  brandId?: string
): Promise<{ success: boolean; data: Coupon[] }> => {
  try {
    const res = await ShoppingAxiosInstance.get("/coupons", { params: { brandId } });
    return res.data;
  } catch (e) {
    throw new Error(extractShoppingError(e, "Failed to load coupons"));
  }
};
