import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ShoppingRouteNames } from '../navigation-maps/Shopping';
import type { ShoppingStackParamList } from '../types/shopping';

// ── Active Screens ──────────────────────────
import ShoppingHomeScreen from '../screens/Shopping/User/ShoppingHome/ShoppingHomeScreen';
import BrandListScreen from '../screens/Shopping/User/BrandList/BrandListScreen';
import BrandStoreScreen from '../screens/Shopping/User/BrandStore/BrandStoreScreen';
import CategoryListScreen from '../screens/Shopping/User/CategoryList/CategoryListScreen';
import ProductListScreen from '../screens/Shopping/User/ProductList/ProductListScreen';
import ProductSearchScreen from '../screens/Shopping/User/ProductSearch/ProductSearchScreen';
import ProductDetailScreen from '../screens/Shopping/User/ProductDetail/ProductDetailScreen';
import ProductReviewsScreen from '../screens/Shopping/User/ProductReviews/ProductReviewsScreen';
import CartScreen from '../screens/Shopping/User/Cart/CartScreen';
import CheckoutAddressScreen from '../screens/Shopping/User/CheckoutAddress/CheckoutAddressScreen';
import CheckoutDeliveryScreen from '../screens/Shopping/User/CheckoutDelivery/CheckoutDeliveryScreen';
import CheckoutPaymentScreen from '../screens/Shopping/User/CheckoutPayment/CheckoutPaymentScreen';
import CheckoutReviewScreen from '../screens/Shopping/User/CheckoutReview/CheckoutReviewScreen';
import WishlistScreen from '../screens/Shopping/User/Wishlist/WishlistScreen';
import OrderConfirmationScreen from '../screens/Shopping/User/OrderConfirmation/OrderConfirmationScreen';
import MyOrdersScreen from '../screens/Shopping/User/MyOrders/MyOrdersScreen';
import OrderTrackingScreen from '../screens/Shopping/User/OrderTracking/OrderTrackingScreen';
import ReturnRequestScreen from '../screens/Shopping/User/ReturnRequest/ReturnRequestScreen';
import WriteReviewScreen from '../screens/Shopping/User/WriteReview/WriteReviewScreen';

const Stack = createNativeStackNavigator<ShoppingStackParamList>();

const ShoppingStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName={ShoppingRouteNames.BrandList}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* ── Discovery ────────────────────────────── */}
      <Stack.Screen
        name={ShoppingRouteNames.ShoppingHome}
        component={ShoppingHomeScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.BrandList}
        component={BrandListScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.BrandStore}
        component={BrandStoreScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.CategoryList}
        component={CategoryListScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.ProductList}
        component={ProductListScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.SearchProducts}
        component={ProductSearchScreen}
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
        name={ShoppingRouteNames.Cart}
        component={CartScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.Wishlist}
        component={WishlistScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.Checkout}
        component={CheckoutAddressScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.CheckoutDelivery}
        component={CheckoutDeliveryScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.CheckoutPayment}
        component={CheckoutPaymentScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.CheckoutReview}
        component={CheckoutReviewScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.OrderConfirmation}
        component={OrderConfirmationScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.MyOrders}
        component={MyOrdersScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.OrderTracking}
        component={OrderTrackingScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.ReturnRequest}
        component={ReturnRequestScreen}
      />
      <Stack.Screen
        name={ShoppingRouteNames.WriteReview}
        component={WriteReviewScreen}
      />
    </Stack.Navigator>
  );
};

export default ShoppingStack;
