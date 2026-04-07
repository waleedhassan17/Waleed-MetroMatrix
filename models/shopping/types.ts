// ============================================
// Shopping Module - TypeScript Types
// ============================================

// ── Brand Config ────────────────────────────

export interface BrandSocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
}

export interface BrandPolicies {
  returnDays: number;
  shippingInfo: string;
  paymentMethods: PaymentMethodType[];
}

export type PaymentMethodType = 'cod' | 'card' | 'jazzcash' | 'easypaisa' | 'bank_transfer';

export interface BrandConfig {
  brandId: string;
  odexId: string;
  name: string;
  slug: string;
  tagline: string;
  logo: string;
  bannerImage: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  categories: Category[];
  policies: BrandPolicies;
  contactEmail: string;
  contactPhone: string;
  website: string;
  socialLinks: BrandSocialLinks;
  isActive: boolean;
  createdAt: string;
}

// ── Category ────────────────────────────────

export interface Category {
  categoryId: string;
  brandId: string;
  name: string;
  slug: string;
  icon: string;
  image: string;
  description: string;
  parentCategoryId?: string;
  productCount: number;
  sortOrder: number;
  isActive: boolean;
}

// ── Product Variant ─────────────────────────

export interface VariantOption {
  name: string;   // e.g. "Size", "Color"
  value: string;  // e.g. "XL", "Red"
}

export interface ProductVariant {
  variantId: string;
  name: string;
  sku: string;
  price: number;
  salePrice?: number;
  options: VariantOption[];
  stock: number;
  images: string[];
  isActive: boolean;
}

// ── Product ─────────────────────────────────

export interface Product {
  productId: string;
  odexId: string;
  brandId: string;
  sku: string;
  name: string;
  description: string;
  images: string[];
  categoryId: string;
  variants: ProductVariant[];
  basePrice: number;
  salePrice?: number;
  rating: number;
  totalReviews: number;
  isFeatured: boolean;
  isNewArrival: boolean;
  inStock: boolean;
  tags: string[];
  createdAt: string;
}

// ── Cart Item ───────────────────────────────

export interface CartItem {
  cartItemId: string;
  productId: string;
  brandId: string;          // Multi-brand cart grouping
  variantId?: string;
  name: string;
  image: string;
  price: number;
  salePrice?: number;
  quantity: number;
  selectedOptions?: VariantOption[];
  maxQuantity: number;
}

// ── Shipping Address ────────────────────────

export interface ShippingAddress {
  addressId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  label?: 'home' | 'office' | 'other';
}

// ── Order Item ──────────────────────────────

export interface OrderItem {
  orderItemId: string;
  productId: string;
  variantId?: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  selectedOptions?: VariantOption[];
  subtotal: number;
}

// ── Order ───────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Order {
  orderId: string;
  odexId: string;
  userId: string;
  brandId: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  trackingNumber?: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  notes?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
}

// ── Wishlist Item ───────────────────────────

export interface WishlistItem {
  wishlistItemId: string;
  productId: string;
  brandId: string;
  name: string;
  image: string;
  price: number;
  salePrice?: number;
  inStock: boolean;
  addedAt: string;
}

// ── Product Review ──────────────────────────

export interface ProductReview {
  reviewId: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  orderId: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  images: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

// ── Coupon / Discount ───────────────────────

export interface ShoppingCoupon {
  couponId: string;
  code: string;
  brandId: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderValue: number;
  isValid: boolean;
  expiresAt: string;
  message: string;
}

// ── Brand Dashboard Stats ───────────────────

export interface BrandDashboardStats {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalProducts: number;
  activeProducts: number;
  totalCustomers: number;
  averageRating: number;
  ordersToday: number;
  revenueToday: number;
}

export interface BrandRevenueChartPoint {
  label: string;
  value: number;
}

export interface BrandDashboardData {
  stats: BrandDashboardStats;
  recentOrders: Order[];
  revenueChart: BrandRevenueChartPoint[];
  topProducts: Product[];
}

// ── Brand Analytics ─────────────────────────

export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface BrandAnalyticsData {
  period: AnalyticsPeriod;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  topSellingProducts: Array<{
    product: Product;
    unitsSold: number;
    revenue: number;
  }>;
  revenueByCategory: Array<{
    categoryName: string;
    revenue: number;
    percentage: number;
  }>;
  orderStatusBreakdown: Array<{
    status: OrderStatus;
    count: number;
    percentage: number;
  }>;
}

// ── Filter / Sort Types ─────────────────────

export type ProductSortBy = 'relevance' | 'price_low' | 'price_high' | 'rating' | 'newest' | 'best_selling';

export interface ProductFilters {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStockOnly?: boolean;
  tags?: string[];
  sortBy?: ProductSortBy;
}

// ── Navigation Param Types ──────────────────

export type ShoppingStackParamList = {
  ShoppingTabs: undefined;
  BrandList: undefined;
  BrandStore: { brandId: string };
  ProductList: { brandId: string; categoryId?: string; categoryName?: string };
  ProductDetail: { productId: string; brandId: string };
  ProductReviews: { productId: string; productName?: string };
  Cart: undefined;
  Checkout: { brandId?: string };
  OrderHistory: undefined;
  OrderDetail: { orderId: string };
  Wishlist: undefined;
  ShoppingSearch: { brandId?: string };
  // Modal screens
  ProductFilters: { brandId: string; currentFilters?: ProductFilters };
  ProductQuickView: { productId: string; brandId: string };
  ImageZoom: { images: string[]; initialIndex?: number };
};

export type BrandStackParamList = {
  BrandTabs: undefined;
  BrandDashboard: undefined;
  BrandProducts: undefined;
  BrandProductDetail: { productId: string };
  BrandAddProduct: undefined;
  BrandEditProduct: { productId: string };
  BrandOrders: undefined;
  BrandOrderDetail: { orderId: string };
  BrandAnalytics: undefined;
  BrandProfile: undefined;
  BrandSettings: undefined;
};

export type BrandTabParamList = {
  BrandHome: undefined;
  BrandProductsTab: undefined;
  BrandOrdersTab: undefined;
  BrandAnalyticsTab: undefined;
  BrandProfileTab: undefined;
};
