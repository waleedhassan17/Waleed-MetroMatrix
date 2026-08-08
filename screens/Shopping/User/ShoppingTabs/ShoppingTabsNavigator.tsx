import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../../../store/hooks';
import { selectCartItemCount } from '../Cart/cartSlice';

// BrandList is reached by drilling in from the shopping home, not as a tab —
// it was imported here but never registered as a Tab.Screen.
import ShoppingHomeScreen from '../ShoppingHome/ShoppingHomeScreen';
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
  CartTab: undefined;
  WishlistTab: undefined;
  Orders: undefined;
};

const Tab = createBottomTabNavigator<ShoppingTabParamList>();

const TAB_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }> = {
  ShopHome:    { label: 'Home',       icon: 'home-outline',       iconFocused: 'home' },
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

/** Icon row + label. The system inset is added on top of this. */
const TAB_BAR_CONTENT_HEIGHT = 62;

const ShoppingTabsNavigator: React.FC = () => {
  // The bar is docked, not floating. Two reasons it had to change:
  //
  //  1. `position: 'absolute'` takes the bar out of the layout, so every screen
  //     had to guess its height with a magic bottom padding — and product rows
  //     still scrolled visibly underneath it. Docked, React Navigation gives
  //     each screen the remaining space and nothing can slide beneath.
  //  2. The app is edge-to-edge on Android (app.json), so the system nav bar
  //     draws over the window. Pinned to a fixed `bottom: 16`, the pill sat
  //     under the OS back/home/recents buttons. The inset is now reserved as
  //     real padding instead.
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          // Lifts the bar off the content it now sits against (Shadows.medium
          // casts downward, which reads as nothing on a bottom-docked edge).
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 12,
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
