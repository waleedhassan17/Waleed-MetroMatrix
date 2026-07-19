// ============================================
// Shopping Module - TypeScript Types
// Primary Color: #E67E22 (Shopping Orange)
// ============================================

// ── Brand Config ──────────────────────────────

export interface BrandSocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
}

export interface BrandPolicies {
  returnDays: number;
  shippingInfo: string;
  paymentMethods: string[];
}

export interface BrandConfig {
  brandId: string;
  odexId: string;
  name: string;
  slug: string;
  description: string;
  tagline: string;
  logo: string;
  bannerImage: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  categories: string[];
  policies: BrandPolicies;
  contactEmail: string;
  contactPhone: string;
  website: string;
  socialLinks: BrandSocialLinks;
  isActive: boolean;
  createdAt: string;
}

// ── Category ──────────────────────────────────

export interface Category {
  categoryId: string;
  name: string;
  slug: string;
  icon: string;
  parentId?: string;
  children: Category[];
  productCount: number;
}

// ── Product ───────────────────────────────────

export interface ProductVariant {
  variantId: string;
  size?: string;
  color?: string;
  colorCode?: string;
  additionalPrice: number;
  stockQuantity: number;
  sku: string;
}

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

// ── Cart ──────────────────────────────────────

export interface CartItem {
  itemId: string;
  productId: string;
  brandId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Cart {
  cartId: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  appliedCoupon?: string;
}

// ── Order ─────────────────────────────────────

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

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded';

export interface OrderItem {
  itemId: string;
  productId: string;
  brandId: string;
  variantId: string;
  productName: string;
  productImage: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Order {
  orderId: string;
  odexId: string;
  userId: string;
  brandId: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  trackingNumber?: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  createdAt: string;
}

// ── Coupon ────────────────────────────────────

export type CouponType = 'percentage' | 'fixed';

export interface Coupon {
  couponCode: string;
  brandId?: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  maxDiscount: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
}

// ── Review ────────────────────────────────────

export interface ProductReview {
  reviewId: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  isVerifiedPurchase: boolean;
  createdAt: string;
}

// ── Wishlist ──────────────────────────────────

export interface WishlistItem {
  productId: string;
  brandId: string;
  addedAt: string;
}

// ── Brand Theme ───────────────────────────────

export interface BrandTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textOnPrimary: string;
}

// ── Outlet (Physical Store Location) ──────────

export interface OutletColorScheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headerBg: string;
  textOnHeader: string;
}

export interface OutletLocation {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
}

export interface OutletConfig {
  outletId: string;
  name: string;
  slug: string;
  description?: string;
  brandId?: string;
  brandName?: string;
  brandPrimaryColor?: string;
  colorScheme?: OutletColorScheme;
  location: OutletLocation;
  phone: string;
  email: string;
  openingHours: string;
  managerName?: string;
  isActive: boolean;
  images: string[];
  floorArea?: number;
  createdAt: string;
  updatedAt?: string;
}

// ── Order Group (multi-vendor checkout) ───────
// One checkout = one OrderGroup (what the customer pays once)
// → N per-brand Orders (what each vendor fulfils independently).

export interface OrderGroupView {
  groupId: string;
  odexId: string;
  userId: string;
  orders: Order[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  appliedCoupon?: string;
  createdAt: string;
}

// ── Saved Address ─────────────────────────────

export interface SavedAddressView extends ShippingAddress {
  addressId: string;
  label?: string;
  isDefault: boolean;
}

// ── Order Tracking ────────────────────────────

export interface OrderTrackingView {
  orderId: string;
  odexId: string;
  orderStatus: OrderStatus;
  trackingNumber?: string;
  statusHistory: {
    status: OrderStatus;
    changedAt: string;
    note?: string;
    role?: string;
  }[];
}

// ── Return Request ────────────────────────────

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'picked_up' | 'refunded';

export interface ReturnRequestView {
  returnId: string;
  orderId: string;
  userId: string;
  brandId: string;
  items: {
    orderItemId: string;
    productId: string;
    productName: string;
    variantId: string;
    quantity: number;
    unitPrice: number;
  }[];
  reason: string;
  images: string[];
  status: ReturnStatus;
  vendorNote?: string;
  refundAmount: number;
  createdAt: string;
}

// ── API Response Wrappers ─────────────────────

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
}

// ── Navigation Param Types ────────────────────

export type ShoppingStackParamList = {
  ShoppingTabs: undefined;
  ShoppingHome: undefined;
  BrandList: undefined;
  BrandStore: { brandId: string };
  ProductList: { brandId: string; categoryId?: string; search?: string };
  ProductDetail: { productId: string; brandId: string };
  ProductReviews: { productId: string };
  Cart: undefined;
  Wishlist: undefined;
  Checkout: { cartId?: string };
  CheckoutDelivery: { addressId?: string };
  CheckoutPayment: { addressId?: string; deliveryOptionId?: string };
  CheckoutReview: { addressId?: string; deliveryOptionId?: string; paymentMethodId?: string };
  MyOrders: undefined;
  OrderConfirmation: { orderId: string };
  OrderList: undefined;
  OrderDetail: { orderId: string };
  OrderTracking: { orderId: string };
  ReturnRequest: { orderId?: string };
  WriteReview: { productId: string };
  SearchProducts: { brandId?: string };
  CategoryList: { brandId?: string };
  CouponList: { brandId?: string };
  AddressSelection: undefined;
  PaymentSelection: { orderId?: string };
};

export type BrandStackParamList = {
  BrandTabs: undefined;
  BrandDashboard: undefined;
  BrandProducts: undefined;
  BrandInventory: undefined;
  AddProduct: { productId?: string };
  EditProduct: { productId: string };
  BrandOrders: undefined;
  BrandOrderDetail: { orderId: string };
  BrandReturnRequests: undefined;
  BrandDeliveries: undefined;
  BrandAnalytics: undefined;
  BrandSettings: undefined;
  BrandCoupons: undefined;
  AddCoupon: { couponCode?: string };
  BrandReviews: undefined;
  BrandProfile: undefined;
};

export type AdminShoppingParamList = {
  AdminShoppingDashboard: undefined;
  AdminBrandList: undefined;
  AdminBrandDetail: { brandId: string };
  AdminAddBrand: { brandId?: string };
  AdminShoppingOrders: undefined;
  AdminShoppingOrderDetail: { orderId: string };
  AdminShoppingAnalytics: undefined;
  AdminShoppingSettings: undefined;
  AdminOutletList: undefined;
  AdminAddOutlet: { outletId?: string };
  AdminOutletDetail: { outletId: string };
};
