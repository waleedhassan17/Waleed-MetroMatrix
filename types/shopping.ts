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
  socialLinks?: BrandSocialLinks;
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
  /** Vendor's switch: false = hidden from the store (kept in their catalogue). */
  isActive?: boolean;
  /** Platform's switch; absent on products from before moderation (= approved). */
  moderation?: ProductModeration;
  /** "View in your room": a .glb for Android's Scene Viewer, optionally a .usdz for iPhone. */
  model3d?: ProductModel3d | null;
  createdAt: string;
}

export interface ProductModel3d {
  glbUrl: string | null;
  usdzUrl?: string | null;
  sizeBytes?: number | null;
  attachedAt?: string | null;
}

export type ProductModerationStatus = 'approved' | 'pending' | 'rejected' | 'removed';

export interface ProductModeration {
  status: ProductModerationStatus;
  note?: string;
  at?: string | null;
}

/** What a vendor or admin sees about whether customers can see a product. */
export function productListingState(p: Pick<Product, 'isActive' | 'moderation'>):
  | 'live'
  | 'hidden'
  | 'in_review'
  | 'needs_changes'
  | 'removed' {
  const status = p.moderation?.status || 'approved';
  if (status === 'removed') return 'removed';
  if (status === 'rejected') return 'needs_changes';
  if (status === 'pending') return 'in_review';
  return p.isActive === false ? 'hidden' : 'live';
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
  /** Vendor-entered courier. Saved by PATCH /vendor/orders/:id/shipping. */
  carrier?: string;
  /**
   * Vendor-private. The schema's toJSON strips it; only the vendor endpoints
   * add it back, so it is absent on customer-facing order responses.
   */
  internalNotes?: string;
  /**
   * The delivery tier the shopper paid for. Snapshotted on the parent
   * OrderGroup at checkout, and attached to the vendor's view of each child
   * order — the child's own `shippingFee` folds the surcharge in and cannot
   * tell you which speed was bought. Null on orders placed before the vendor
   * endpoints started exposing it.
   */
  deliveryOption?: { id: string; name: string; surcharge: number } | null;
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
  area?: string;
  landmark?: string;
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

/**
 * How natural-language search (`q`) understood a query — GET /products
 * returns it as `interpretedAs`. "red nike shoes under 3k" →
 * { color: 'red', brandName: 'Nike', category: 'shoes', maxPrice: 3000 }.
 */
export interface ProductQueryInterpretation {
  terms?: string;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  gender?: 'men' | 'women' | 'kids';
  brandId?: string;
  brandName?: string;
  category?: string;
  categoryIds?: string[];
  /** 'llm' when Gemini interpreted a description the rules could not. */
  source?: 'rules' | 'llm';
  /** Chips the shopper removed (sent back as `ignore`). */
  ignored?: InterpretationChipKey[];
}

export type InterpretationChipKey = 'price' | 'color' | 'gender' | 'brand' | 'category';

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
  ShoppingTabs: { brandId?: string } | undefined;
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
  /** allBrands: full cross-brand history; omitted inside a brand's tabs. */
  MyOrders: { allBrands?: boolean } | undefined;
  OrderConfirmation: { orderId: string };
  OrderList: undefined;
  OrderDetail: { orderId: string };
  OrderTracking: { orderId: string };
  ReturnRequest: { orderId?: string };
  WriteReview: { productId: string };
  SearchProducts: { brandId?: string };
  CouponList: { brandId?: string };
  AddressSelection: undefined;
  PaymentSelection: { orderId?: string };
  ShoppingNotifications: { audience?: 'customer' | 'vendor' } | undefined;
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
  BrandNotifications: { audience?: 'customer' | 'vendor' } | undefined;
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
  AdminBannerList: undefined;
  AdminProductModeration: undefined;
};
