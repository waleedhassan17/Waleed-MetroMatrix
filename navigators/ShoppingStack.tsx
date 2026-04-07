import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ShoppingRouteNames } from '../navigation-maps/Shopping';
import type { ShoppingStackParamList } from '../models/shopping/types';

// Tab Navigator
import ShoppingTabNavigator from '../screens/user/shopping/tabs/ShoppingTabNavigator';

// Customer-facing screens
import BrandListScreen from '../screens/user/shopping/brand-list/BrandListScreen';
import BrandStoreScreen from '../screens/user/shopping/brand-store/brandStore';
import ProductListScreen from '../screens/user/shopping/product-list/productList';
import ProductDetailScreen from '../screens/user/shopping/product-detail/productDetail';
import ProductReviewsScreen from '../screens/user/shopping/product-reviews/productReviews';
import CartScreen from '../screens/user/shopping/cart/cart';
import CheckoutScreen from '../screens/user/shopping/checkout/checkout';
import OrderHistoryScreen from '../screens/user/shopping/order-history/orderHistory';
import OrderDetailScreen from '../screens/user/shopping/order-detail/orderDetail';
import WishlistScreen from '../screens/user/shopping/wishlist/wishlist';
import SearchScreen from '../screens/user/shopping/search/search';

const Stack = createNativeStackNavigator<ShoppingStackParamList>();

// ── Deep-link Configuration ─────────────────
export const shoppingLinking = {
  screens: {
    [ShoppingRouteNames.ShoppingTabs]: 'shopping',
    [ShoppingRouteNames.BrandList]: 'shopping/brands',
    [ShoppingRouteNames.BrandStore]: 'shopping/brand/:brandId',
    [ShoppingRouteNames.ProductDetail]: 'shopping/product/:productId',
    [ShoppingRouteNames.ProductList]: 'shopping/brand/:brandId/products',
    [ShoppingRouteNames.Cart]: 'shopping/cart',
    [ShoppingRouteNames.Checkout]: 'shopping/checkout',
    [ShoppingRouteNames.OrderHistory]: 'shopping/orders',
    [ShoppingRouteNames.OrderDetail]: 'shopping/order/:orderId',
    [ShoppingRouteNames.Wishlist]: 'shopping/wishlist',
  },
};

const ShoppingStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName={ShoppingRouteNames.ShoppingTabs}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Tab Navigator */}
      <Stack.Screen
        name={ShoppingRouteNames.ShoppingTabs}
        component={ShoppingTabNavigator}
      />

      {/* Store & Browse */}
      <Stack.Screen
        name={ShoppingRouteNames.BrandList}
        component={BrandListScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.BrandStore}
        component={BrandStoreScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.ProductList}
        component={ProductListScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.ProductDetail}
        component={ProductDetailScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.ProductReviews}
        component={ProductReviewsScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.ShoppingSearch}
        component={SearchScreen}
      />

      {/* Cart & Checkout */}
      <Stack.Screen
        name={ShoppingRouteNames.Cart}
        component={CartScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.Checkout}
        component={CheckoutScreen}
      />

      {/* Orders */}
      <Stack.Screen
        name={ShoppingRouteNames.OrderHistory}
        component={OrderHistoryScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.OrderDetail}
        component={OrderDetailScreen}
      />

      {/* Wishlist */}
      <Stack.Screen
        name={ShoppingRouteNames.Wishlist}
        component={WishlistScreen}
      />

      {/* ── Modal Screens ──────────────────────── */}
      <Stack.Screen
        name={ShoppingRouteNames.ProductFilters}
        component={ProductListScreen} // Will be replaced with dedicated filter modal
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name={ShoppingRouteNames.ProductQuickView}
        component={ProductDetailScreen} // Will be replaced with quick-view modal
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name={ShoppingRouteNames.ImageZoom}
        component={ProductDetailScreen} // Will be replaced with image zoom modal
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      />
    </Stack.Navigator>
  );
};

export default ShoppingStack;
