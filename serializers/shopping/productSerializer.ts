// ============================================
// Shopping Module - Product Serializers
// ============================================

import type { Product, ProductReview, Order, Cart, Coupon } from '../../types/shopping';
import {
  ProductSchema,
  ProductListSchema,
  ProductReviewSchema,
  ProductReviewListSchema,
  OrderSchema,
  OrderListSchema,
  CartSchema,
  CouponSchema,
  CouponListSchema,
} from '../../models/shopping/productModel';

// ── Product Serializers ─────────────────────

export function serializeProduct(data: unknown): Product {
  return ProductSchema.parse(data);
}

export function serializeProductList(data: unknown): Product[] {
  return ProductListSchema.parse(data);
}

// ── Review Serializers ──────────────────────

export function serializeProductReview(data: unknown): ProductReview {
  return ProductReviewSchema.parse(data);
}

export function serializeProductReviewList(data: unknown): ProductReview[] {
  return ProductReviewListSchema.parse(data);
}

// ── Order Serializers ───────────────────────

export function serializeOrder(data: unknown): Order {
  return OrderSchema.parse(data);
}

export function serializeOrderList(data: unknown): Order[] {
  return OrderListSchema.parse(data);
}

// ── Cart Serializer ─────────────────────────

export function serializeCart(data: unknown): Cart {
  return CartSchema.parse(data);
}

// ── Coupon Serializers ──────────────────────

export function serializeCoupon(data: unknown): Coupon {
  return CouponSchema.parse(data);
}

export function serializeCouponList(data: unknown): Coupon[] {
  return CouponListSchema.parse(data);
}

// ── Safe Serializers (non-throwing) ─────────

export function safeProductSerialize(data: unknown) {
  return ProductSchema.safeParse(data);
}

export function safeProductListSerialize(data: unknown) {
  return ProductListSchema.safeParse(data);
}

export function safeOrderSerialize(data: unknown) {
  return OrderSchema.safeParse(data);
}

export function safeOrderListSerialize(data: unknown) {
  return OrderListSchema.safeParse(data);
}

export function safeCartSerialize(data: unknown) {
  return CartSchema.safeParse(data);
}
