// ============================================
// Shopping Module - Route Constants
// ============================================

// Customer / User Routes
export const ShoppingRouteNames = {
  ShoppingTabs: 'ShoppingTabs',
  ShoppingHome: 'ShoppingHome',
  BrandList: 'BrandList',
  BrandStore: 'BrandStore',
  ProductList: 'ProductList',
  ProductDetail: 'ProductDetail',
  ProductReviews: 'ProductReviews',
  Cart: 'Cart',
  Wishlist: 'Wishlist',
  Checkout: 'Checkout',
  CheckoutDelivery: 'CheckoutDelivery',
  CheckoutPayment: 'CheckoutPayment',
  CheckoutReview: 'CheckoutReview',
  MyOrders: 'MyOrders',
  OrderConfirmation: 'OrderConfirmation',
  OrderList: 'OrderList',
  OrderDetail: 'OrderDetail',
  OrderTracking: 'OrderTracking',
  ReturnRequest: 'ReturnRequest',
  WriteReview: 'WriteReview',
  SearchProducts: 'SearchProducts',
  CouponList: 'CouponList',
  AddressSelection: 'AddressSelection',
  PaymentSelection: 'PaymentSelection',
} as const;

// Brand Owner Routes
export const BrandRouteNames = {
  BrandTabs: 'BrandTabs',
  BrandDashboard: 'BrandDashboard',
  BrandProducts: 'BrandProducts',
  BrandInventory: 'BrandInventory',
  AddProduct: 'AddProduct',
  EditProduct: 'EditProduct',
  BrandOrders: 'BrandOrders',
  BrandOrderDetail: 'BrandOrderDetail',
  BrandReturnRequests: 'BrandReturnRequests',
  BrandDeliveries: 'BrandDeliveries',
  BrandAnalytics: 'BrandAnalytics',
  BrandSettings: 'BrandSettings',
  BrandCoupons: 'BrandCoupons',
  AddCoupon: 'AddCoupon',
  BrandReviews: 'BrandReviews',
  BrandProfile: 'BrandProfile',
} as const;

// Admin Shopping Routes
export const AdminShoppingRouteNames = {
  AdminShoppingDashboard: 'AdminShoppingDashboard',
  AdminBrandList: 'AdminBrandList',
  AdminBrandDetail: 'AdminBrandDetail',
  AdminAddBrand: 'AdminAddBrand',
  AdminShoppingOrders: 'AdminShoppingOrders',
  AdminShoppingOrderDetail: 'AdminShoppingOrderDetail',
  AdminShoppingAnalytics: 'AdminShoppingAnalytics',
  AdminShoppingSettings: 'AdminShoppingSettings',
  AdminOutletList: 'AdminOutletList',
  AdminAddOutlet: 'AdminAddOutlet',
  AdminOutletDetail: 'AdminOutletDetail',
} as const;

export type ShoppingRouteName = typeof ShoppingRouteNames[keyof typeof ShoppingRouteNames];
export type BrandRouteName = typeof BrandRouteNames[keyof typeof BrandRouteNames];
export type AdminShoppingRouteName = typeof AdminShoppingRouteNames[keyof typeof AdminShoppingRouteNames];
