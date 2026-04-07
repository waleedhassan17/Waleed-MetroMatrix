// ============================================
// Shopping Module - Serializers (Zod Validation)
// ============================================

import type {
  BrandConfig,
  Product,
  Order,
  CartItem,
  WishlistItem,
  ProductReview,
  Category,
} from '../../models/shopping/types';
import {
  BrandConfigSchema,
  BrandConfigListSchema,
  ProductSchema,
  ProductListSchema,
  OrderSchema,
  OrderListSchema,
  CartItemSchema,
  CartItemListSchema,
  WishlistItemSchema,
  WishlistItemListSchema,
  ProductReviewSchema,
  ProductReviewListSchema,
  CategorySchema,
  CategoryListSchema,
} from '../../models/shopping/shoppingModel';

// ── Strict Serializers (throw on invalid) ───

export function serializeBrandConfig(data: unknown): BrandConfig {
  return BrandConfigSchema.parse(data);
}

export function serializeProduct(data: unknown): Product {
  return ProductSchema.parse(data);
}

export function serializeProductList(data: unknown): Product[] {
  return ProductListSchema.parse(data);
}

export function serializeOrder(data: unknown): Order {
  return OrderSchema.parse(data);
}

export function serializeOrderList(data: unknown): Order[] {
  return OrderListSchema.parse(data);
}

export function serializeCartItem(data: unknown): CartItem {
  return CartItemSchema.parse(data);
}

export function serializeCartItemList(data: unknown): CartItem[] {
  return CartItemListSchema.parse(data);
}

export function serializeWishlistItem(data: unknown): WishlistItem {
  return WishlistItemSchema.parse(data);
}

export function serializeWishlistItemList(data: unknown): WishlistItem[] {
  return WishlistItemListSchema.parse(data);
}

export function serializeProductReview(data: unknown): ProductReview {
  return ProductReviewSchema.parse(data);
}

export function serializeProductReviewList(data: unknown): ProductReview[] {
  return ProductReviewListSchema.parse(data);
}

export function serializeCategory(data: unknown): Category {
  return CategorySchema.parse(data);
}

export function serializeCategoryList(data: unknown): Category[] {
  return CategoryListSchema.parse(data);
}

// ── Safe Serializers (non-throwing) ─────────

export function safeBrandConfigSerialize(data: unknown) {
  return BrandConfigSchema.safeParse(data);
}

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

export function safeCartItemSerialize(data: unknown) {
  return CartItemSchema.safeParse(data);
}

export function safeWishlistItemSerialize(data: unknown) {
  return WishlistItemSchema.safeParse(data);
}

export function safeProductReviewSerialize(data: unknown) {
  return ProductReviewSchema.safeParse(data);
}

export function safeProductReviewListSerialize(data: unknown) {
  return ProductReviewListSchema.safeParse(data);
}
