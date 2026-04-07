import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../../../../store/hooks';

import BrandHomeScreen from '../brand-home/brandHome';
import BrandProductsScreen from '../brand-products/brandProducts';
import BrandOrdersScreen from '../brand-orders/brandOrders';
import BrandAnalyticsScreen from '../brand-analytics/brandAnalytics';
import BrandProfileScreen from '../brand-profile/brandProfile';

import type { BrandTabParamList } from '../../../../models/shopping/types';

// ── Brand Owner Palette ─────────────────────
const COLORS = {
  primary: '#6C5CE7',
  primaryDark: '#5A4BD1',
  surface: '#FFFFFF',
  border: '#E8E5FF',
  textTertiary: '#94A3B8',
  badge: '#EF4444',
};

const Tab = createBottomTabNavigator<BrandTabParamList>();

const TAB_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }> = {
  BrandHome:         { label: 'Dashboard', icon: 'grid-outline',        iconFocused: 'grid' },
  BrandProductsTab:  { label: 'Products',  icon: 'cube-outline',        iconFocused: 'cube' },
  BrandOrdersTab:    { label: 'Orders',    icon: 'receipt-outline',     iconFocused: 'receipt' },
  BrandAnalyticsTab: { label: 'Analytics', icon: 'stats-chart-outline', iconFocused: 'stats-chart' },
  BrandProfileTab:   { label: 'Profile',   icon: 'person-outline',     iconFocused: 'person' },
};

const TabIcon: React.FC<{ routeName: string; focused: boolean; badgeCount?: number }> = ({ routeName, focused, badgeCount }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const config = TAB_CONFIG[routeName];

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.15 : 1,
      tension: 300,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
      {focused ? (
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBgActive}
        >
          <Ionicons name={config.iconFocused} size={20} color="#FFFFFF" />
        </LinearGradient>
      ) : (
        <View style={styles.iconBgInactive}>
          <Ionicons name={config.icon} size={20} color={COLORS.textTertiary} />
        </View>
      )}
      {/* Unread order badge */}
      {badgeCount !== undefined && badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
        </View>
      )}
    </Animated.View>
  );
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  // Pull unread order count from brandHome slice
  const pendingOrders = useAppSelector((s) => s.brandHome?.loading ? 0 : 0); // Will be wired when brandHomeSlice is fully implemented

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name];
          const badgeCount = route.name === 'BrandOrdersTab' ? pendingOrders : undefined;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabButton}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={config.label}
            >
              <TabIcon routeName={route.name} focused={isFocused} badgeCount={badgeCount} />
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]} numberOfLines={1}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const BrandTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="BrandHome" component={BrandHomeScreen} />
      <Tab.Screen name="BrandProductsTab" component={BrandProductsScreen} />
      <Tab.Screen name="BrandOrdersTab" component={BrandOrdersScreen} />
      <Tab.Screen name="BrandAnalyticsTab" component={BrandAnalyticsScreen} />
      <Tab.Screen name="BrandProfileTab" component={BrandProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.10, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  tabBarInner: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  iconWrap: { marginBottom: 4 },
  iconBgActive: { width: 40, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  iconBgInactive: { width: 40, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { fontSize: 11, fontWeight: '500', color: COLORS.textTertiary, letterSpacing: 0.1 },
  tabLabelActive: { fontWeight: '700', color: COLORS.primary },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.badge,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
});

export default BrandTabNavigator;
