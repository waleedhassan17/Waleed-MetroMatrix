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

const Stack = createNativeStackNavigator<BrandStackParamList>();

const BrandStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName={BrandRouteNames.BrandDashboard as keyof BrandStackParamList}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
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
    </Stack.Navigator>
  );
};

export default BrandStack;
