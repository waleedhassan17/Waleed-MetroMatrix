// ============================================
// Shopping Module - Order API
// Uses dummy data until backend is ready.
// ============================================

import type {
  Order,
  Cart,
  Coupon,
  OrderStatus,
  ShippingAddress,
  PaginatedResponse,
  SingleResponse,
} from "../../types/shopping";
import {
  SAMPLE_ORDERS,
  OUTFITTERS_COUPONS,
  simulateDelay,
  paginateArray,
  singleResponse,
} from "./dummyData";

// In-memory cart state
let CART: Cart = {
  cartId: 'cart_001',
  userId: 'current_user',
  items: [],
  subtotal: 0,
  discount: 0,
  shippingFee: 0,
  total: 0,
  appliedCoupon: undefined,
};

// Mutable orders
let ALL_ORDERS: Order[] = [...SAMPLE_ORDERS];

const recalcCart = () => {
  CART.subtotal = CART.items.reduce((s, i) => s + i.totalPrice, 0);
  CART.shippingFee = CART.subtotal >= 3000 ? 0 : 200;
  CART.total = CART.subtotal - CART.discount + CART.shippingFee;
};

// ── Cart ────────────────────────────────────

export const fetchCartApi = async (): Promise<SingleResponse<Cart>> => {
  await simulateDelay(200);
  console.log("✅ [Dummy] Cart fetched:", CART.items.length, "items");
  return singleResponse({ ...CART });
};

export const addToCartApi = async (payload: {
  productId: string;
  brandId: string;
  variantId: string;
  quantity: number;
}): Promise<SingleResponse<Cart>> => {
  await simulateDelay(300);
  const existing = CART.items.find(
    (i) => i.productId === payload.productId && i.variantId === payload.variantId
  );
  if (existing) {
    existing.quantity += payload.quantity;
    existing.totalPrice = existing.unitPrice * existing.quantity;
  } else {
    const unitPrice = 1490 + Math.floor(Math.random() * 3000);
    CART.items.push({
      itemId: `item_${Date.now()}`,
      productId: payload.productId,
      brandId: payload.brandId,
      variantId: payload.variantId,
      quantity: payload.quantity,
      unitPrice,
      totalPrice: unitPrice * payload.quantity,
    });
  }
  recalcCart();
  console.log("✅ [Dummy] Item added to cart");
  return singleResponse({ ...CART });
};

export const updateCartItemApi = async (
  itemId: string,
  quantity: number
): Promise<SingleResponse<Cart>> => {
  await simulateDelay(200);
  const item = CART.items.find((i) => i.itemId === itemId);
  if (item) {
    item.quantity = quantity;
    item.totalPrice = item.unitPrice * quantity;
  }
  recalcCart();
  console.log("✅ [Dummy] Cart item updated");
  return singleResponse({ ...CART });
};

export const removeCartItemApi = async (
  itemId: string
): Promise<SingleResponse<Cart>> => {
  await simulateDelay(200);
  CART.items = CART.items.filter((i) => i.itemId !== itemId);
  recalcCart();
  console.log("✅ [Dummy] Cart item removed");
  return singleResponse({ ...CART });
};

export const clearCartApi = async (): Promise<{ success: boolean }> => {
  await simulateDelay(200);
  CART.items = [];
  CART.discount = 0;
  CART.appliedCoupon = undefined;
  recalcCart();
  console.log("✅ [Dummy] Cart cleared");
  return { success: true };
};

// ── Coupons ─────────────────────────────────

export const applyCouponApi = async (
  couponCode: string
): Promise<SingleResponse<Cart>> => {
  await simulateDelay(300);
  const coupon = OUTFITTERS_COUPONS.find(
    (c) => c.couponCode.toLowerCase() === couponCode.toLowerCase()
  );
  if (!coupon) {
    throw new Error("Invalid coupon code");
  }
  if (CART.subtotal < coupon.minOrderAmount) {
    throw new Error(`Minimum order of PKR ${coupon.minOrderAmount} required`);
  }
  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = Math.min((CART.subtotal * coupon.value) / 100, coupon.maxDiscount);
  } else {
    discount = coupon.value;
  }
  CART.discount = Math.round(discount);
  CART.appliedCoupon = couponCode;
  recalcCart();
  console.log("✅ [Dummy] Coupon applied:", couponCode, "discount:", CART.discount);
  return singleResponse({ ...CART });
};

export const removeCouponApi = async (): Promise<SingleResponse<Cart>> => {
  await simulateDelay(200);
  CART.discount = 0;
  CART.appliedCoupon = undefined;
  recalcCart();
  console.log("✅ [Dummy] Coupon removed");
  return singleResponse({ ...CART });
};

export const fetchCouponsApi = async (
  brandId?: string
): Promise<{ success: boolean; data: Coupon[] }> => {
  await simulateDelay(200);
  let coupons = OUTFITTERS_COUPONS;
  if (brandId) {
    coupons = coupons.filter((c) => !c.brandId || c.brandId === brandId);
  }
  console.log("✅ [Dummy] Coupons fetched:", coupons.length);
  return { success: true, data: coupons };
};

// ── Orders ──────────────────────────────────

export const createOrderApi = async (payload: {
  shippingAddress: ShippingAddress;
  paymentMethod: string;
}): Promise<SingleResponse<Order>> => {
  await simulateDelay(600);
  const order: Order = {
    orderId: `ORD-${Date.now()}`,
    odexId: `ODX-O-${Date.now()}`,
    userId: 'current_user',
    brandId: CART.items[0]?.brandId || 'brand_outfitters_001',
    items: CART.items.map((item) => ({
      itemId: item.itemId,
      productId: item.productId,
      brandId: item.brandId,
      variantId: item.variantId,
      productName: 'Product',
      productImage: '',
      variantLabel: '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    shippingAddress: payload.shippingAddress,
    paymentMethod: payload.paymentMethod,
    paymentStatus: payload.paymentMethod === 'COD' ? 'pending' : 'paid',
    orderStatus: 'confirmed',
    subtotal: CART.subtotal,
    discount: CART.discount,
    shippingFee: CART.shippingFee,
    total: CART.total,
    createdAt: new Date().toISOString(),
  };
  ALL_ORDERS.unshift(order);
  // Clear cart after order
  CART.items = [];
  CART.discount = 0;
  CART.appliedCoupon = undefined;
  recalcCart();
  console.log("✅ [Dummy] Order created:", order.orderId);
  return singleResponse(order);
};

export const fetchOrdersApi = async ({
  page = 1,
  limit = 20,
  status,
}: {
  page?: number;
  limit?: number;
  status?: string;
} = {}): Promise<PaginatedResponse<Order>> => {
  await simulateDelay(300);
  let orders = [...ALL_ORDERS];
  if (status) {
    orders = orders.filter((o) => o.orderStatus === status);
  }
  console.log("✅ [Dummy] Orders fetched:", orders.length);
  return paginateArray(orders, page, limit);
};

export const fetchOrderByIdApi = async (
  orderId: string
): Promise<SingleResponse<Order>> => {
  await simulateDelay(200);
  const order = ALL_ORDERS.find((o) => o.orderId === orderId);
  if (!order) {
    throw new Error("Order not found");
  }
  console.log("✅ [Dummy] Order fetched:", order.orderId);
  return singleResponse(order);
};

export const cancelOrderApi = async (
  orderId: string,
  reason?: string
): Promise<SingleResponse<Order>> => {
  await simulateDelay(400);
  const order = ALL_ORDERS.find((o) => o.orderId === orderId);
  if (!order) {
    throw new Error("Order not found");
  }
  order.orderStatus = 'cancelled';
  console.log("✅ [Dummy] Order cancelled:", orderId);
  return singleResponse(order);
};

// ── Brand Owner: Update Order Status ────────

export const updateOrderStatusApi = async (
  orderId: string,
  payload: { orderStatus: string; trackingNumber?: string }
): Promise<SingleResponse<Order>> => {
  await simulateDelay(300);
  const order = ALL_ORDERS.find((o) => o.orderId === orderId);
  if (!order) {
    throw new Error("Order not found");
  }
  order.orderStatus = payload.orderStatus as OrderStatus;
  if (payload.trackingNumber) {
    order.trackingNumber = payload.trackingNumber;
  }
  console.log("✅ [Dummy] Order status updated:", orderId, "->", payload.orderStatus);
  return singleResponse(order);
};
