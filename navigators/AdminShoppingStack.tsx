import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminShoppingRouteNames } from '../navigation-maps/Shopping';
import type { AdminShoppingParamList } from '../types/shopping';

import BrandManagementScreen from '../screens/admin/Shopping/BrandManagement/BrandManagementScreen';
import AddBrandScreen from '../screens/admin/Shopping/AddBrand/AddBrandScreen';
import EditBrandScreen from '../screens/admin/Shopping/EditBrand/EditBrandScreen';
import OutletManagementScreen from '../screens/admin/Shopping/OutletManagement/OutletManagementScreen';
import AddOutletScreen from '../screens/admin/Shopping/AddOutlet/AddOutletScreen';
import OutletDetailScreen from '../screens/admin/Shopping/OutletDetail/OutletDetailScreen';
import AdminShoppingDashboardScreen from '../screens/admin/Shopping/AdminShoppingDashboard/AdminShoppingDashboardScreen';
import AdminShoppingOrdersScreen from '../screens/admin/Shopping/AdminShoppingOrders/AdminShoppingOrdersScreen';
import AdminShoppingOrderDetailScreen from '../screens/admin/Shopping/AdminShoppingOrderDetail/AdminShoppingOrderDetailScreen';
import AdminShoppingAnalyticsScreen from '../screens/admin/Shopping/AdminShoppingAnalytics/AdminShoppingAnalyticsScreen';
import AdminShoppingSettingsScreen from '../screens/admin/Shopping/AdminShoppingSettings/AdminShoppingSettingsScreen';

const Stack = createNativeStackNavigator<AdminShoppingParamList>();

const AdminShoppingStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName={AdminShoppingRouteNames.AdminShoppingDashboard as keyof AdminShoppingParamList}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Dashboard & oversight */}
      <Stack.Screen
        name={AdminShoppingRouteNames.AdminShoppingDashboard}
        component={AdminShoppingDashboardScreen}
      />
      <Stack.Screen
        name={AdminShoppingRouteNames.AdminShoppingOrders}
        component={AdminShoppingOrdersScreen}
      />
      <Stack.Screen
        name={AdminShoppingRouteNames.AdminShoppingOrderDetail}
        component={AdminShoppingOrderDetailScreen}
      />
      <Stack.Screen
        name={AdminShoppingRouteNames.AdminShoppingAnalytics}
        component={AdminShoppingAnalyticsScreen}
      />
      <Stack.Screen
        name={AdminShoppingRouteNames.AdminShoppingSettings}
        component={AdminShoppingSettingsScreen}
      />

      {/* Brand Management */}
      <Stack.Screen
        name={AdminShoppingRouteNames.AdminBrandList}
        component={BrandManagementScreen}
      />
      <Stack.Screen
        name={AdminShoppingRouteNames.AdminAddBrand}
        component={AddBrandScreen}
      />
      <Stack.Screen
        name={AdminShoppingRouteNames.AdminBrandDetail}
        component={EditBrandScreen}
      />

      {/* Outlet Management */}
      <Stack.Screen
        name={AdminShoppingRouteNames.AdminOutletList}
        component={OutletManagementScreen}
      />
      <Stack.Screen
        name={AdminShoppingRouteNames.AdminAddOutlet}
        component={AddOutletScreen}
      />
      <Stack.Screen
        name={AdminShoppingRouteNames.AdminOutletDetail}
        component={OutletDetailScreen}
      />
    </Stack.Navigator>
  );
};

export default AdminShoppingStack;
