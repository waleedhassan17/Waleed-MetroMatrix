import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../../../store/hooks';
import { selectCartItemCount } from '../Cart/cartSlice';

import BrandListScreen from '../BrandList/BrandListScreen';
import ShoppingHomeScreen from '../ShoppingHome/ShoppingHomeScreen';
import CartScreen from '../Cart/CartScreen';
import WishlistScreen from '../Wishlist/WishlistScreen';
import MyOrdersScreen from '../MyOrders/MyOrdersScreen';
import { Shadows } from '../../../../constants/Colors';

// Shopping orange palette — matches the rest of the shopping module
const COLORS = {
  primary: '#E67E22',
  surface: '#FFFFFF',
  border: '#F0E4D7',
  inactive: '#94A3B8',
};

type ShoppingTabParamList = {
  ShopHome: undefined;
  Brands: undefined;
  CartTab: undefined;
  WishlistTab: undefined;
  Orders: undefined;
};

const Tab = createBottomTabNavigator<ShoppingTabParamList>();

const TAB_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }> = {
  ShopHome:    { label: 'Home',       icon: 'home-outline',       iconFocused: 'home' },
  Brands:      { label: 'Brands',     icon: 'storefront-outline', iconFocused: 'storefront' },
  CartTab:     { label: 'Cart',       icon: 'cart-outline',       iconFocused: 'cart' },
  WishlistTab: { label: 'Wishlist',   icon: 'heart-outline',      iconFocused: 'heart' },
  Orders:      { label: 'Orders',     icon: 'receipt-outline',    iconFocused: 'receipt' },
};

const CartIconWithBadge: React.FC<{ focused: boolean; color: string; size: number }> = ({ focused, color, size }) => {
  const count = useAppSelector(selectCartItemCount);
  return (
    <View>
      <Ionicons name={focused ? 'cart' : 'cart-outline'} size={size} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </View>
  );
};

const ShoppingTabsNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: 'transparent',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          borderRadius: 20,
          ...Shadows.medium,
        },
        tabBarLabel: TAB_CONFIG[route.name]?.label ?? route.name,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'CartTab') {
            return <CartIconWithBadge focused={focused} color={color} size={size} />;
          }
          const config = TAB_CONFIG[route.name];
          return (
            <Ionicons name={focused ? config.iconFocused : config.icon} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="ShopHome" component={ShoppingHomeScreen} />
      <Tab.Screen name="Brands" component={BrandListScreen} />
      <Tab.Screen name="CartTab" component={CartScreen} />
      <Tab.Screen name="WishlistTab" component={WishlistScreen} />
      <Tab.Screen name="Orders" component={MyOrdersScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E74C3C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
});

export default ShoppingTabsNavigator;
