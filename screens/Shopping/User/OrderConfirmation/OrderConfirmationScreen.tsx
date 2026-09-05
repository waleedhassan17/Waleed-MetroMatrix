import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ClipboardList, MapPinned, Store } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing, makeColors, type ColorType } from '../../../../constants/Colors';
import { useTheme } from '../../../../theme';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setLastOrderId } from './orderConfirmationSlice';
import { selectActiveBrand } from '../BrandList/brandListSlice';

/** Same short form the orders list uses, so the two screens agree. */
const formatOrderNumber = (id?: string) =>
  id ? `#${id.substring(0, 8).toUpperCase()}` : '';

const OrderConfirmationScreen: React.FC = () => {
  const { mode } = useTheme();
  const Colors = useMemo(() => makeColors(mode), [mode]);
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const orderId = route.params?.orderId as string | undefined;
  const activeBrand = useAppSelector(selectActiveBrand);

  useEffect(() => {
    if (orderId) {
      dispatch(setLastOrderId(orderId));
    }
  }, [dispatch, orderId]);

  // Checkout is four screens deep. Stepping back through address → delivery →
  // payment → review to reach the shop again is not an exit, and those screens
  // are meaningless once the order exists — so drop the stack entirely.
  const handleContinueShopping = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: ShoppingRouteNames.ShoppingTabs }],
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.lg }]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={Colors.background} />

      <View style={styles.body}>
        <View style={styles.successRing}>
          <View style={styles.successDisc}>
            <Check size={34} stroke="#FFFFFF" strokeWidth={3} />
          </View>
        </View>

        <Text style={styles.title}>Order confirmed</Text>
        <Text style={styles.subtitle}>
          Thanks{activeBrand?.name ? ` for shopping with ${activeBrand.name}` : ''}. We've sent
          the details to your email and you can follow it from your orders.
        </Text>

        {/* The full hex id was printed inline mid-sentence, which read as
            garbled text. Shoppers quote a short number — the full id stays
            available underneath for support. */}
        {!!orderId && (
          <View style={styles.orderChip}>
            <Text style={styles.orderChipLabel}>ORDER</Text>
            <Text style={styles.orderChipValue}>{formatOrderNumber(orderId)}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate(ShoppingRouteNames.MyOrders)}
        >
          <ClipboardList size={17} stroke="#FFF" strokeWidth={2} />
          <Text style={styles.primaryText}>View Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate(ShoppingRouteNames.OrderTracking, { orderId })}
        >
          <MapPinned size={17} stroke={Colors.primary} strokeWidth={2} />
          <Text style={styles.secondaryText}>Track Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tertiaryBtn}
          activeOpacity={0.7}
          onPress={handleContinueShopping}
        >
          <Store size={16} stroke={Colors.text.secondary} strokeWidth={2} />
          <Text style={styles.tertiaryText}>
            {activeBrand?.name ? `Back to ${activeBrand.name}` : 'Continue Shopping'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (Colors: ColorType) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successDisc: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: Spacing.lg,
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: Spacing.sm,
    fontSize: 14,
    textAlign: 'center',
    color: Colors.text.secondary,
    lineHeight: 21,
    paddingHorizontal: Spacing.md,
  },
  orderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  orderChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.text.tertiary,
  },
  orderChipValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: 0.5,
  },
  actions: {
    gap: Spacing.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    ...Shadows.small,
  },
  primaryText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryMuted,
  },
  secondaryText: { color: Colors.primary, fontWeight: '800', fontSize: 15 },
  tertiaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
  },
  tertiaryText: { color: Colors.text.secondary, fontWeight: '600', fontSize: 14 },
});

export default OrderConfirmationScreen;
