import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Tag, Ticket } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchAvailableCoupons, selectCouponList } from './couponListSlice';
import { applyCouponAsync, removeCoupon, selectAppliedCoupon, selectCartSubtotal } from '../Cart/cartSlice';

const ShopColors = { primary: '#E67E22', primaryLight: '#FFF3E6', success: '#27AE60', danger: '#E74C3C' };
const CURRENCY = 'PKR';

const CouponListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { coupons, loading, error } = useAppSelector(selectCouponList);
  const appliedCoupon = useAppSelector(selectAppliedCoupon);
  const cartSubtotal = useAppSelector(selectCartSubtotal);
  const brandId = route.params?.brandId as string | undefined;

  useEffect(() => {
    dispatch(fetchAvailableCoupons(brandId));
  }, [dispatch, brandId]);

  const reasonNotApplicable = (coupon: (typeof coupons)[number]): string | null => {
    if (cartSubtotal < coupon.minOrderAmount) {
      return `Add ${CURRENCY} ${(coupon.minOrderAmount - cartSubtotal).toLocaleString()} more to use this coupon`;
    }
    return null;
  };

  const handleApply = async (couponCode: string) => {
    const result = await dispatch(applyCouponAsync(couponCode));
    if (applyCouponAsync.fulfilled.match(result)) {
      Alert.alert('Coupon applied', `${couponCode} has been applied to your cart.`);
      navigation.goBack();
    } else {
      Alert.alert('Cannot apply coupon', (result.payload as string) || 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Coupons</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && coupons.length === 0 && (
          <ActivityIndicator color={ShopColors.primary} style={{ marginVertical: Spacing.xl }} />
        )}
        {error && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchAvailableCoupons(brandId))}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        {!loading && !error && coupons.length === 0 && (
          <View style={styles.center}>
            <Ticket size={40} stroke={Colors.text.tertiary} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No coupons available right now</Text>
          </View>
        )}

        {coupons.map((coupon) => {
          const blocked = reasonNotApplicable(coupon);
          const isApplied = appliedCoupon?.code === coupon.couponCode;
          return (
            <View key={coupon.couponCode} style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.codeChip}>
                  <Tag size={14} stroke={ShopColors.primary} strokeWidth={2} />
                  <Text style={styles.codeText}>{coupon.couponCode}</Text>
                </View>
                <Text style={styles.cardDesc}>
                  {coupon.type === 'percentage'
                    ? `${coupon.value}% off${coupon.maxDiscount ? ` up to ${CURRENCY} ${coupon.maxDiscount.toLocaleString()}` : ''}`
                    : `${CURRENCY} ${coupon.value.toLocaleString()} off`}
                  {coupon.minOrderAmount > 0 ? ` · min order ${CURRENCY} ${coupon.minOrderAmount.toLocaleString()}` : ''}
                </Text>
                <Text style={styles.cardExpiry}>
                  Valid till {new Date(coupon.validUntil).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                {blocked && <Text style={styles.blockedText}>{blocked}</Text>}
              </View>
              {isApplied ? (
                <TouchableOpacity style={styles.removeBtn} onPress={() => dispatch(removeCoupon())}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.applyBtn, blocked ? styles.applyBtnDisabled : null]}
                  disabled={!!blocked}
                  onPress={() => handleApply(coupon.couponCode)}
                >
                  <Text style={[styles.applyText, blocked ? styles.applyTextDisabled : null]}>Apply</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  center: { alignItems: 'center', paddingVertical: Spacing.xl },
  errorText: { color: Colors.text.secondary, textAlign: 'center', marginBottom: Spacing.md },
  retryBtn: { backgroundColor: ShopColors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  emptyText: { color: Colors.text.secondary, marginTop: Spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  cardLeft: { flex: 1, marginRight: Spacing.md },
  codeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: ShopColors.primaryLight, borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  codeText: { fontSize: 13, fontWeight: '800', color: ShopColors.primary, letterSpacing: 0.5 },
  cardDesc: { fontSize: 13, color: Colors.text.primary, marginTop: Spacing.xs, fontWeight: '600' },
  cardExpiry: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
  blockedText: { fontSize: 12, color: ShopColors.danger, marginTop: 4 },
  applyBtn: { backgroundColor: ShopColors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 18, paddingVertical: 8 },
  applyBtnDisabled: { backgroundColor: Colors.border },
  applyText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  applyTextDisabled: { color: Colors.text.tertiary },
  removeBtn: { borderWidth: 1, borderColor: ShopColors.danger, borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 8 },
  removeText: { color: ShopColors.danger, fontWeight: '700', fontSize: 13 },
});

export default CouponListScreen;
