// ============================================
// Shopping Module - Zod Validation Schemas
// ============================================

import { z } from 'zod';

// ── Brand Social Links ──────────────────────

export const BrandSocialLinksSchema = z.object({
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  tiktok: z.string().optional(),
  youtube: z.string().optional(),
  linkedin: z.string().optional(),
});

// ── Brand Policies ──────────────────────────

export const PaymentMethodTypeSchema = z.enum([
  'cod', 'card', 'jazzcash', 'easypaisa', 'bank_transfer',
]);

export const BrandPoliciesSchema = z.object({
  returnDays: z.number().min(0),
  shippingInfo: z.string(),
  paymentMethods: z.array(PaymentMethodTypeSchema),
});

// ── Category ────────────────────────────────

export const CategorySchema = z.object({
  categoryId: z.string(),
  brandId: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string(),
  image: z.string(),
  description: z.string(),
  parentCategoryId: z.string().optional(),
  productCount: z.number(),
  sortOrder: z.number(),
  isActive: z.boolean(),
});

// ── Brand Config ────────────────────────────

export const BrandConfigSchema = z.object({
  brandId: z.string(),
  odexId: z.string(),
  name: z.string(),
  slug: z.string(),
  tagline: z.string(),
  logo: z.string(),
  bannerImage: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  categories: z.array(CategorySchema),
  policies: BrandPoliciesSchema,
  contactEmail: z.string().email(),
  contactPhone: z.string(),
  website: z.string(),
  socialLinks: BrandSocialLinksSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
});

// ── Variant Option ──────────────────────────

export const VariantOptionSchema = z.object({
  name: z.string(),
  value: z.string(),
});

// ── Product Variant ─────────────────────────

export const ProductVariantSchema = z.object({
  variantId: z.string(),
  name: z.string(),
  sku: z.string(),
  price: z.number().min(0),
  salePrice: z.number().min(0).optional(),
  options: z.array(VariantOptionSchema),
  stock: z.number().min(0),
  images: z.array(z.string()),
  isActive: z.boolean(),
});

// ── Product ─────────────────────────────────

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
  basePrice: z.number().min(0),
  salePrice: z.number().min(0).optional(),
  rating: z.number().min(0).max(5),
  totalReviews: z.number().min(0),
  isFeatured: z.boolean(),
  isNewArrival: z.boolean(),
  inStock: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.string(),
});

// ── Cart Item ───────────────────────────────

export const CartItemSchema = z.object({
  cartItemId: z.string(),
  productId: z.string(),
  brandId: z.string(),
  variantId: z.string().optional(),
  name: z.string(),
  image: z.string(),
  price: z.number().min(0),
  salePrice: z.number().min(0).optional(),
  quantity: z.number().min(1),
  selectedOptions: z.array(VariantOptionSchema).optional(),
  maxQuantity: z.number().min(1),
});

// ── Shipping Address ────────────────────────

export const ShippingAddressSchema = z.object({
  addressId: z.string(),
  fullName: z.string(),
  phone: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string(),
  isDefault: z.boolean(),
  label: z.enum(['home', 'office', 'other']).optional(),
});

// ── Order Item ──────────────────────────────

export const OrderItemSchema = z.object({
  orderItemId: z.string(),
  productId: z.string(),
  variantId: z.string().optional(),
  name: z.string(),
  image: z.string(),
  price: z.number().min(0),
  quantity: z.number().min(1),
  selectedOptions: z.array(VariantOptionSchema).optional(),
  subtotal: z.number().min(0),
});

// ── Order ───────────────────────────────────

export const OrderStatusSchema = z.enum([
  'pending', 'confirmed', 'processing', 'shipped',
  'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded',
]);

export const PaymentStatusSchema = z.enum([
  'pending', 'completed', 'failed', 'refunded',
]);

export const OrderSchema = z.object({
  orderId: z.string(),
  odexId: z.string(),
  userId: z.string(),
  brandId: z.string(),
  items: z.array(OrderItemSchema),
  shippingAddress: ShippingAddressSchema,
  paymentMethod: PaymentMethodTypeSchema,
  paymentStatus: PaymentStatusSchema,
  orderStatus: OrderStatusSchema,
  trackingNumber: z.string().optional(),
  subtotal: z.number().min(0),
  discount: z.number().min(0),
  shippingFee: z.number().min(0),
  total: z.number().min(0),
  notes: z.string().optional(),
  estimatedDelivery: z.string().optional(),
  deliveredAt: z.string().optional(),
  cancelledAt: z.string().optional(),
  cancellationReason: z.string().optional(),
  createdAt: z.string(),
});

// ── Wishlist Item ───────────────────────────

export const WishlistItemSchema = z.object({
  wishlistItemId: z.string(),
  productId: z.string(),
  brandId: z.string(),
  name: z.string(),
  image: z.string(),
  price: z.number().min(0),
  salePrice: z.number().min(0).optional(),
  inStock: z.boolean(),
  addedAt: z.string(),
});

// ── Product Review ──────────────────────────

export const ProductReviewSchema = z.object({
  reviewId: z.string(),
  productId: z.string(),
  userId: z.string(),
  userName: z.string(),
  userAvatar: z.string().optional(),
  orderId: z.string(),
  rating: z.number().min(1).max(5),
  title: z.string(),
  comment: z.string(),
  images: z.array(z.string()),
  isVerifiedPurchase: z.boolean(),
  helpfulCount: z.number().min(0),
  createdAt: z.string(),
});

// ── Shopping Coupon ─────────────────────────

export const ShoppingCouponSchema = z.object({
  couponId: z.string(),
  code: z.string(),
  brandId: z.string(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0),
  maxDiscount: z.number().min(0).optional(),
  minOrderValue: z.number().min(0),
  isValid: z.boolean(),
  expiresAt: z.string(),
  message: z.string(),
});

// ── List Schemas ────────────────────────────

export const BrandConfigListSchema = z.array(BrandConfigSchema);
export const ProductListSchema = z.array(ProductSchema);
export const OrderListSchema = z.array(OrderSchema);
export const CartItemListSchema = z.array(CartItemSchema);
export const WishlistItemListSchema = z.array(WishlistItemSchema);
export const ProductReviewListSchema = z.array(ProductReviewSchema);
export const CategoryListSchema = z.array(CategorySchema);

// ── Type Exports (inferred from schemas) ────

export type BrandConfigZ = z.infer<typeof BrandConfigSchema>;
export type ProductZ = z.infer<typeof ProductSchema>;
export type ProductVariantZ = z.infer<typeof ProductVariantSchema>;
export type CartItemZ = z.infer<typeof CartItemSchema>;
export type OrderZ = z.infer<typeof OrderSchema>;
export type OrderItemZ = z.infer<typeof OrderItemSchema>;
export type WishlistItemZ = z.infer<typeof WishlistItemSchema>;
export type ProductReviewZ = z.infer<typeof ProductReviewSchema>;
export type ShoppingCouponZ = z.infer<typeof ShoppingCouponSchema>;
export type CategoryZ = z.infer<typeof CategorySchema>;
export type ShippingAddressZ = z.infer<typeof ShippingAddressSchema>;

// ── Validation Helpers ──────────────────────

export function validateBrandConfig(data: unknown) {
  return BrandConfigSchema.safeParse(data);
}

export function validateProduct(data: unknown) {
  return ProductSchema.safeParse(data);
}

export function validateProductList(data: unknown) {
  return ProductListSchema.safeParse(data);
}

export function validateOrder(data: unknown) {
  return OrderSchema.safeParse(data);
}

export function validateOrderList(data: unknown) {
  return OrderListSchema.safeParse(data);
}

export function validateCartItem(data: unknown) {
  return CartItemSchema.safeParse(data);
}

export function validateWishlistItem(data: unknown) {
  return WishlistItemSchema.safeParse(data);
}

export function validateProductReview(data: unknown) {
  return ProductReviewSchema.safeParse(data);
}
