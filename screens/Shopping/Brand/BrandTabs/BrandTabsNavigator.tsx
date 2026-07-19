import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import BrandHomeScreen from '../BrandHome/BrandHomeScreen';
import BrandProductsScreen from '../BrandProducts/BrandProductsScreen';
import BrandOrdersScreen from '../BrandOrders/BrandOrdersScreen';
import BrandAnalyticsScreen from '../BrandAnalytics/BrandAnalyticsScreen';
import BrandProfileScreen from '../BrandProfile/BrandProfileScreen';

const COLORS = {
  primary: '#E67E22',
  surface: '#FFFFFF',
  border: '#F0E4D7',
  inactive: '#94A3B8',
};

type BrandTabParamList = {
  Dashboard: undefined;
  Products: undefined;
  Orders: undefined;
  Analytics: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<BrandTabParamList>();

const TAB_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { label: 'Dashboard', icon: 'speedometer-outline', iconFocused: 'speedometer' },
  Products:  { label: 'Products',  icon: 'cube-outline',        iconFocused: 'cube' },
  Orders:    { label: 'Orders',    icon: 'clipboard-outline',   iconFocused: 'clipboard' },
  Analytics: { label: 'Analytics', icon: 'bar-chart-outline',   iconFocused: 'bar-chart' },
  Profile:   { label: 'Profile',   icon: 'business-outline',    iconFocused: 'business' },
};

const BrandTabsNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabel: TAB_CONFIG[route.name]?.label ?? route.name,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const config = TAB_CONFIG[route.name];
          return (
            <Ionicons name={focused ? config.iconFocused : config.icon} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={BrandHomeScreen} />
      <Tab.Screen name="Products" component={BrandProductsScreen} />
      <Tab.Screen name="Orders" component={BrandOrdersScreen} />
      <Tab.Screen name="Analytics" component={BrandAnalyticsScreen} />
      <Tab.Screen name="Profile" component={BrandProfileScreen} />
    </Tab.Navigator>
  );
};

export default BrandTabsNavigator;
