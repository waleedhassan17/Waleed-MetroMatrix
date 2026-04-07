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

import ShoppingHomeScreen from '../shopping-home/ShoppingHomeScreen';
import CartScreen from '../cart/cart';
import WishlistScreen from '../wishlist/wishlist';
import OrderHistoryScreen from '../order-history/orderHistory';
import SearchScreen from '../search/search';

// ── Shopping Palette ────────────────────────
const COLORS = {
  primary: '#6C5CE7',
  primaryDark: '#5A4BD1',
  primaryLight: '#F0EDFF',
  accent: '#A29BFE',
  surface: '#FFFFFF',
  border: '#E8E5FF',
  textPrimary: '#1A1A1A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
};

type TabParamList = {
  ShopHome: undefined;
  ShopSearch: undefined;
  ShopCart: undefined;
  ShopWishlist: undefined;
  ShopOrders: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }> = {
  ShopHome:     { label: 'Shop',     icon: 'storefront-outline',     iconFocused: 'storefront' },
  ShopSearch:   { label: 'Search',   icon: 'search-outline',         iconFocused: 'search' },
  ShopCart:     { label: 'Cart',     icon: 'cart-outline',           iconFocused: 'cart' },
  ShopWishlist: { label: 'Wishlist', icon: 'heart-outline',          iconFocused: 'heart' },
  ShopOrders:   { label: 'Orders',   icon: 'receipt-outline',        iconFocused: 'receipt' },
};

const TabIcon: React.FC<{ routeName: string; focused: boolean }> = ({ routeName, focused }) => {
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
    </Animated.View>
  );
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name];

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
              <TabIcon routeName={route.name} focused={isFocused} />
              <Text
                style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
                numberOfLines={1}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const ShoppingTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="ShopHome" component={ShoppingHomeScreen} />
      <Tab.Screen name="ShopSearch" component={SearchScreen} />
      <Tab.Screen name="ShopCart" component={CartScreen} />
      <Tab.Screen name="ShopWishlist" component={WishlistScreen} />
      <Tab.Screen name="ShopOrders" component={OrderHistoryScreen} />
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
});

export default ShoppingTabNavigator;
