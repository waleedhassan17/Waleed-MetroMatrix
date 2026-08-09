import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Plus, Tag } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { BrandRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchBrandCoupons, selectBrandCoupons, updateBrandCoupon } from './brandCouponsSlice';
import { ShopColors } from '../theme';
import BrandHeader, { BrandHeaderAction } from '../BrandHeader';

const CURRENCY = 'PKR';

const BrandCouponsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { coupons, loading, error } = useAppSelector(selectBrandCoupons);

  useEffect(() => {
    dispatch(fetchBrandCoupons());
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <BrandHeader
        title="My Coupons"
        showBack
        actions={
          <BrandHeaderAction onPress={() => navigation.navigate(BrandRouteNames.AddCoupon, {})}>
            <Plus size={20} stroke={ShopColors.primary} strokeWidth={2} />
          </BrandHeaderAction>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && coupons.length === 0 && (
          <ActivityIndicator color={ShopColors.primary} style={{ marginVertical: Spacing.xl }} />
        )}
        {error && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchBrandCoupons())}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        {!loading && !error && coupons.length === 0 && (
          <View style={styles.center}>
            <Tag size={40} stroke={Colors.text.tertiary} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No coupons yet — create your first one.</Text>
          </View>
        )}

        {coupons.map((coupon) => {
          const expired = new Date(coupon.validUntil) < new Date();
          const active = coupon.isActive !== false && !expired;
          return (
            <View key={coupon.couponCode} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.code}>{coupon.couponCode}</Text>
                <View style={[styles.stateChip, { backgroundColor: active ? '#27AE6020' : '#6B728020' }]}>
                  <Text style={[styles.stateText, { color: active ? ShopColors.success : '#6B7280' }]}>
                    {expired ? 'Expired' : active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <Text style={styles.desc}>
                {coupon.type === 'percentage'
                  ? `${coupon.value}% off${coupon.maxDiscount ? ` (max ${CURRENCY} ${coupon.maxDiscount.toLocaleString()})` : ''}`
                  : `${CURRENCY} ${coupon.value.toLocaleString()} off`}
                {coupon.minOrderAmount > 0 ? ` · min ${CURRENCY} ${coupon.minOrderAmount.toLocaleString()}` : ''}
              </Text>
              <Text style={styles.meta}>
                {new Date(coupon.validFrom).toLocaleDateString()} → {new Date(coupon.validUntil).toLocaleDateString()}
                {' · '}used {coupon.usedCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : ''}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate(BrandRouteNames.AddCoupon, { couponCode: coupon.couponCode })}
                >
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                {!expired && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() =>
                      dispatch(
                        updateBrandCoupon({
                          couponCode: coupon.couponCode,
                          updates: { isActive: !(coupon.isActive !== false) },
                        })
                      )
                    }
                  >
                    <Text style={[styles.actionText, { color: active ? ShopColors.danger : ShopColors.success }]}>
                      {active ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  center: { alignItems: 'center', paddingVertical: Spacing.xl },
  errorText: { color: Colors.text.secondary, marginBottom: Spacing.md, textAlign: 'center' },
  retryBtn: { backgroundColor: ShopColors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  emptyText: { color: Colors.text.secondary, marginTop: Spacing.sm },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code: { fontSize: 16, fontWeight: '800', color: ShopColors.primary, letterSpacing: 0.5 },
  stateChip: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 3 },
  stateText: { fontSize: 11, fontWeight: '700' },
  desc: { fontSize: 13, fontWeight: '600', color: Colors.text.primary, marginTop: Spacing.xs },
  meta: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  actionBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 7 },
  actionText: { fontSize: 13, fontWeight: '600', color: ShopColors.primary },
});

export default BrandCouponsScreen;
