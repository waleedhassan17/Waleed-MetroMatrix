import React, { useEffect } from 'react';
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
import {
  fetchMyBrand,
  selectBrandProfile,
} from '../screens/Shopping/Brand/BrandProfile/brandProfileSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { ThemeProvider } from '../theme';

const Stack = createNativeStackNavigator<BrandStackParamList>();

const BrandStack: React.FC = () => {
  const dispatch = useAppDispatch();
  const { brand } = useAppSelector(selectBrandProfile);

  // Fetched HERE, at the top of the vendor's world, rather than only inside the
  // three screens that used to ask for it. The tab bar sits above those screens
  // and so could never see the brand — which is why the single most visible
  // brand-coloured surface in the app was hardcoded orange.
  useEffect(() => {
    if (!brand) dispatch(fetchMyBrand());
  }, [dispatch, brand]);

  return (
    // Shopping orange until the brand loads, then their own colours. Every
    // shared component below recolours without knowing brands exist.
    <ThemeProvider module="shopping" brand={brand}>
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
    </ThemeProvider>
  );
};

export default BrandStack;
