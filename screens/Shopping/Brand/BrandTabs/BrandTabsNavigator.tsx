import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import BrandHomeScreen from '../BrandHome/BrandHomeScreen';
import BrandProductsScreen from '../BrandProducts/BrandProductsScreen';
import BrandOrdersScreen from '../BrandOrders/BrandOrdersScreen';
import BrandAnalyticsScreen from '../BrandAnalytics/BrandAnalyticsScreen';
import BrandProfileScreen from '../BrandProfile/BrandProfileScreen';
import { F, useTheme } from '../../../../theme';

// The local `const COLORS` block that used to live here is gone. It hardcoded
// `primary: '#E67E22'` — so a brand could set its colours and then look at the
// most prominent brand surface it has, its own tab bar, still painted the
// generic shopping orange. It also carried `border: '#F0E4D7'`, a value that
// appears in no palette anywhere in the app.

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

/** Icon row + label. The system inset is added on top of this. */
const TAB_BAR_CONTENT_HEIGHT = 62;

const BrandTabsNavigator: React.FC = () => {
  // The app is edge-to-edge on Android, so the system nav bar draws over the
  // window. With a fixed 62pt height the OS back/home/recents buttons landed
  // on top of the tab labels — reserve the inset as real padding instead.
  const insets = useSafeAreaInsets();
  // `accentDeep` rather than `accent`: the active tint is a small label on a
  // white ground, which is the one place a mid-tone brand colour most often
  // fails contrast. For a brand that set no secondary this resolves back to
  // their primary, and with no brand at all to shopping orange.
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accentDeep,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabel: TAB_CONFIG[route.name]?.label ?? route.name,
        tabBarLabelStyle: { fontFamily: F.semibold, fontSize: 11 },
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
