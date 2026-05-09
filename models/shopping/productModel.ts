// ============================================
// Shopping Module - Product Zod Validation Schemas
// ============================================

import { z } from 'zod';

// ── Product Variant Schema ──────────────────

export const ProductVariantSchema = z.object({
  variantId: z.string(),
  size: z.string().optional(),
  color: z.string().optional(),
  colorCode: z.string().optional(),
  additionalPrice: z.number(),
  stockQuantity: z.number(),
  sku: z.string(),
});

// ── Product Schema ──────────────────────────

export const ProductSchema = z.object({
  productId: z.string(),
  odexId: z.string(),
  brandId: z.string(),
  sku: z.string(),
  name: z.string(),
  description: z.string(),
  images: z.array(z.string()),
  categoryId: z.string(),
  variants: z.array(ProductVariantSchema),
  basePrice: z.number(),
  salePrice: z.number().optional(),
  rating: z.number(),
  totalReviews: z.number(),
  isFeatured: z.boolean(),
  isNewArrival: z.boolean(),
  inStock: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.string(),
});

// ── Product Review Schema ───────────────────

export const ProductReviewSchema = z.object({
  reviewId: z.string(),
  productId: z.string(),
  userId: z.string(),
  userName: z.string(),
  userAvatar: z.string().optional(),
  rating: z.number(),
  title: z.string().optional(),
  comment: z.string(),
  images: z.array(z.string()).optional(),
  isVerifiedPurchase: z.boolean(),
  createdAt: z.string(),
});

// ── Coupon Schema ───────────────────────────

export const CouponSchema = z.object({
  couponCode: z.string(),
  brandId: z.string().optional(),
  type: z.enum(['percentage', 'fixed']),
  value: z.number(),
  minOrderAmount: z.number(),
  maxDiscount: z.number(),
  validFrom: z.string(),
  validUntil: z.string(),
  usageLimit: z.number(),
  usedCount: z.number(),
});

// ── Order Schemas ───────────────────────────

export const OrderItemSchema = z.object({
  itemId: z.string(),
  productId: z.string(),
  brandId: z.string(),
  variantId: z.string(),
  productName: z.string(),
  productImage: z.string(),
  variantLabel: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
});

export const ShippingAddressSchema = z.object({
  fullName: z.string(),
  phone: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string(),
});

export const OrderSchema = z.object({
  orderId: z.string(),
  odexId: z.string(),
  userId: z.string(),
  brandId: z.string(),
  items: z.array(OrderItemSchema),
  shippingAddress: ShippingAddressSchema,
  paymentMethod: z.string(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']),
  orderStatus: z.enum([
    'pending', 'confirmed', 'processing', 'shipped',
    'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded',
  ]),
  trackingNumber: z.string().optional(),
  subtotal: z.number(),
  discount: z.number(),
  shippingFee: z.number(),
  total: z.number(),
  createdAt: z.string(),
});

// ── Cart Schemas ────────────────────────────

export const CartItemSchema = z.object({
  itemId: z.string(),
  productId: z.string(),
  brandId: z.string(),
  variantId: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
});

export const CartSchema = z.object({
  cartId: z.string(),
  userId: z.string(),
  items: z.array(CartItemSchema),
  subtotal: z.number(),
  discount: z.number(),
  shippingFee: z.number(),
  total: z.number(),
  appliedCoupon: z.string().optional(),
});

// ── List Schemas ────────────────────────────

export const ProductListSchema = z.array(ProductSchema);
export const ProductReviewListSchema = z.array(ProductReviewSchema);
export const OrderListSchema = z.array(OrderSchema);
export const CouponListSchema = z.array(CouponSchema);
