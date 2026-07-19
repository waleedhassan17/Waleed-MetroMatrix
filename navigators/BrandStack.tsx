import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BrandRouteNames } from '../navigation-maps/Shopping';
import type { BrandStackParamList } from '../types/shopping';
import BrandHomeScreen from '../screens/Shopping/Brand/BrandHome/BrandHomeScreen';
import BrandProductsScreen from '../screens/Shopping/Brand/BrandProducts/BrandProductsScreen';
import ProductFormScreen from '../screens/Shopping/Brand/ProductForm/ProductFormScreen';
import InventoryScreen from '../screens/Shopping/Brand/Inventory/InventoryScreen';
import BrandOrdersScreen from '../screens/Shopping/Brand/BrandOrders/BrandOrdersScreen';
import ProcessOrderScreen from '../screens/Shopping/Brand/ProcessOrder/ProcessOrderScreen';
import ReturnRequestsScreen from '../screens/Shopping/Brand/ReturnRequests/ReturnRequestsScreen';
import BrandAnalyticsScreen from '../screens/Shopping/Brand/BrandAnalytics/BrandAnalyticsScreen';
import BrandDeliveriesScreen from '../screens/Shopping/Brand/BrandDeliveries/BrandDeliveriesScreen';
import BrandTabsNavigator from '../screens/Shopping/Brand/BrandTabs/BrandTabsNavigator';
import BrandProfileScreen from '../screens/Shopping/Brand/BrandProfile/BrandProfileScreen';
import BrandSettingsScreen from '../screens/Shopping/Brand/BrandSettings/BrandSettingsScreen';
import BrandCouponsScreen from '../screens/Shopping/Brand/BrandCoupons/BrandCouponsScreen';
import AddCouponScreen from '../screens/Shopping/Brand/AddCoupon/AddCouponScreen';
import BrandReviewsScreen from '../screens/Shopping/Brand/BrandReviews/BrandReviewsScreen';

const Stack = createNativeStackNavigator<BrandStackParamList>();

const BrandStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName={BrandRouteNames.BrandTabs as keyof BrandStackParamList}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name={BrandRouteNames.BrandTabs}
        component={BrandTabsNavigator}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandDashboard}
        component={BrandHomeScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandProducts}
        component={BrandProductsScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandInventory}
        component={InventoryScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.AddProduct}
        component={ProductFormScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.EditProduct}
        component={ProductFormScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandOrders}
        component={BrandOrdersScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandOrderDetail}
        component={ProcessOrderScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandReturnRequests}
        component={ReturnRequestsScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandAnalytics}
        component={BrandAnalyticsScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandDeliveries}
        component={BrandDeliveriesScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandProfile}
        component={BrandProfileScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandSettings}
        component={BrandSettingsScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandCoupons}
        component={BrandCouponsScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.AddCoupon}
        component={AddCouponScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandReviews}
        component={BrandReviewsScreen}
      />
    </Stack.Navigator>
  );
};

export default BrandStack;
