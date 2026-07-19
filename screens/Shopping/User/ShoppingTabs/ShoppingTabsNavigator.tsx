import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../../../store/hooks';
import { selectCartItemCount } from '../Cart/cartSlice';

import ShoppingHomeScreen from '../ShoppingHome/ShoppingHomeScreen';
import CategoryListScreen from '../CategoryList/CategoryListScreen';
import CartScreen from '../Cart/CartScreen';
import WishlistScreen from '../Wishlist/WishlistScreen';
import MyOrdersScreen from '../MyOrders/MyOrdersScreen';

// Shopping orange palette — matches the rest of the shopping module
const COLORS = {
  primary: '#E67E22',
  surface: '#FFFFFF',
  border: '#F0E4D7',
  inactive: '#94A3B8',
};

type ShoppingTabParamList = {
  ShopHome: undefined;
  Categories: undefined;
  CartTab: undefined;
  WishlistTab: undefined;
  Orders: undefined;
};

const Tab = createBottomTabNavigator<ShoppingTabParamList>();

const TAB_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }> = {
  ShopHome:    { label: 'Home',       icon: 'storefront-outline', iconFocused: 'storefront' },
  Categories:  { label: 'Categories', icon: 'grid-outline',       iconFocused: 'grid' },
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
          borderTopColor: COLORS.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabel: TAB_CONFIG[route.name]?.label ?? route.name,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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
      <Tab.Screen name="Categories" component={CategoryListScreen} />
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
