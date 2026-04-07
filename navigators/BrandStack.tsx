import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BrandRouteNames } from '../navigation-maps/Shopping';
import type { BrandStackParamList } from '../models/shopping/types';

// Tab Navigator (Bottom tabs + stack)
import BrandTabNavigator from '../screens/providers/shopping/tabs/BrandTabNavigator';

// Brand owner detail screens (stacked on top of tabs)
import BrandHomeScreen from '../screens/providers/shopping/brand-home/brandHome';
import BrandProductsScreen from '../screens/providers/shopping/brand-products/brandProducts';
import BrandOrdersScreen from '../screens/providers/shopping/brand-orders/brandOrders';
import BrandAnalyticsScreen from '../screens/providers/shopping/brand-analytics/brandAnalytics';
import BrandProfileScreen from '../screens/providers/shopping/brand-profile/brandProfile';

const Stack = createNativeStackNavigator<BrandStackParamList>();

// ── Deep-link Configuration ─────────────────
export const brandLinking = {
  screens: {
    [BrandRouteNames.BrandTabs]: 'brand',
    [BrandRouteNames.BrandDashboard]: 'brand/dashboard',
    [BrandRouteNames.BrandProducts]: 'brand/products',
    [BrandRouteNames.BrandProductDetail]: 'brand/products/:productId',
    [BrandRouteNames.BrandOrders]: 'brand/orders',
    [BrandRouteNames.BrandOrderDetail]: 'brand/orders/:orderId',
    [BrandRouteNames.BrandAnalytics]: 'brand/analytics',
    [BrandRouteNames.BrandProfile]: 'brand/profile',
  },
};

const BrandStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName={BrandRouteNames.BrandTabs}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Tab Navigator (Dashboard, Products, Orders, Analytics, Profile) */}
      <Stack.Screen
        name={BrandRouteNames.BrandTabs}
        component={BrandTabNavigator}
      />

      {/* Detail Screens (pushed on top of tabs) */}
      <Stack.Screen
        name={BrandRouteNames.BrandDashboard}
        component={BrandHomeScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandProducts}
        component={BrandProductsScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandProductDetail}
        component={BrandProductsScreen} // Will be replaced with dedicated screen
      />
      <Stack.Screen
        name={BrandRouteNames.BrandAddProduct}
        component={BrandProductsScreen} // Will be replaced with add product form
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandEditProduct}
        component={BrandProductsScreen} // Will be replaced with edit product form
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandOrders}
        component={BrandOrdersScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandOrderDetail}
        component={BrandOrdersScreen} // Will be replaced with dedicated screen
      />
      <Stack.Screen
        name={BrandRouteNames.BrandAnalytics}
        component={BrandAnalyticsScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandProfile}
        component={BrandProfileScreen}
      />
      <Stack.Screen
        name={BrandRouteNames.BrandSettings}
        component={BrandProfileScreen} // Will be replaced with settings screen
      />
    </Stack.Navigator>
  );
};

export default BrandStack;
