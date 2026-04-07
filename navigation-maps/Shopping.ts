// ============================================
// Shopping Module - Route Constants
// ============================================

// Customer / User Routes
export const ShoppingRouteNames = {
  // Tabs
  ShoppingTabs: 'ShoppingTabs',

  // Store & Browse
  BrandList: 'BrandList',
  BrandStore: 'BrandStore',
  ProductList: 'ProductList',
  ProductDetail: 'ProductDetail',
  ProductReviews: 'ProductReviews',
  ShoppingSearch: 'ShoppingSearch',

  // Cart & Checkout
  Cart: 'Cart',
  Checkout: 'Checkout',

  // Orders
  OrderHistory: 'OrderHistory',
  OrderDetail: 'OrderDetail',

  // Wishlist
  Wishlist: 'Wishlist',

  // Modal Screens
  ProductFilters: 'ProductFilters',
  ProductQuickView: 'ProductQuickView',
  ImageZoom: 'ImageZoom',
} as const;

// Brand Owner / Provider Routes
export const BrandRouteNames = {
  // Tabs
  BrandTabs: 'BrandTabs',

  // Dashboard
  BrandDashboard: 'BrandDashboard',

  // Products
  BrandProducts: 'BrandProducts',
  BrandProductDetail: 'BrandProductDetail',
  BrandAddProduct: 'BrandAddProduct',
  BrandEditProduct: 'BrandEditProduct',

  // Orders
  BrandOrders: 'BrandOrders',
  BrandOrderDetail: 'BrandOrderDetail',

  // Analytics
  BrandAnalytics: 'BrandAnalytics',

  // Profile & Settings
  BrandProfile: 'BrandProfile',
  BrandSettings: 'BrandSettings',
} as const;

export type ShoppingRouteName = typeof ShoppingRouteNames[keyof typeof ShoppingRouteNames];
export type BrandRouteName = typeof BrandRouteNames[keyof typeof BrandRouteNames];
