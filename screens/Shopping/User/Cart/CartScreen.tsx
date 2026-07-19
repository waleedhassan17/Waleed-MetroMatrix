import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  Minus,
  Plus,
  Trash2,
  Tag,
  X,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import {
  fetchCart,
  removeItem,
  updateQuantity,
  removeCoupon,
  applyCouponAsync,
  clearCart,
  selectCart,
  selectCartGroupedByBrand,
  selectBrandSubtotals,
  selectAppliedCoupon,
  selectCouponDiscount,
  selectCartTotal,
  selectCartLoading,
  selectCartError,
} from './cartSlice';

const ShopColors = { primary: '#E67E22', primaryLight: '#FFF3E6', success: '#27AE60', danger: '#E74C3C' };
const CURRENCY = 'PKR';
const FREE_SHIPPING_THRESHOLD = 3000;

const CartScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const cart = useAppSelector(selectCart);
  const brandGroups = useAppSelector(selectCartGroupedByBrand);
  const brandSubtotals = useAppSelector(selectBrandSubtotals);
  const appliedCoupon = useAppSelector(selectAppliedCoupon);
  const couponDiscount = useAppSelector(selectCouponDiscount);
  const total = useAppSelector(selectCartTotal);
  const loading = useAppSelector(selectCartLoading);
  const error = useAppSelector(selectCartError);

  const [couponInput, setCouponInput] = useState('');

  // The server owns the cart — sync on mount
  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);
  const [showCouponInput, setShowCouponInput] = useState(false);

  const handleRemoveItem = useCallback((itemId: string) => {
    dispatch(removeItem(itemId));
  }, [dispatch]);

  const handleUpdateQuantity = useCallback((itemId: string, delta: number) => {
    const item = cart.items.find((i) => i.itemId === itemId);
    if (item) {
      dispatch(updateQuantity({ itemId, quantity: Math.max(1, item.quantity + delta) }));
    }
  }, [dispatch, cart.items]);

  const handleApplyCoupon = useCallback(() => {
    if (!couponInput.trim()) return;
    dispatch(applyCouponAsync(couponInput.trim()));
    setCouponInput('');
    setShowCouponInput(false);
  }, [dispatch, couponInput]);

  const handleRemoveCoupon = useCallback(() => {
    dispatch(removeCoupon());
  }, [dispatch]);

  const handleCheckout = useCallback(() => {
    if (cart.items.length === 0) return;
    navigation.navigate(ShoppingRouteNames.Checkout);
  }, [navigation, cart.items.length]);

  if (cart.items.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={22} stroke={Colors.text.primary} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Cart</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <ShoppingBag size={64} stroke={Colors.borderDark} strokeWidth={1} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Looks like you have not added anything to your cart yet.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate(ShoppingRouteNames.ShoppingHome)}>
            <Text style={styles.browseBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart ({cart.items.reduce((s, i) => s + i.quantity, 0)} items)</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={() => Alert.alert('Clear Cart', 'Remove all items?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear', style: 'destructive', onPress: () => dispatch(clearCart()) },
        ])}>
          <Trash2 size={18} stroke={ShopColors.danger} strokeWidth={1.75} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {brandGroups.map((group) => {
          const brandSub = brandSubtotals.get(group.brandId) || 0;
          const brandShipping = brandSub >= FREE_SHIPPING_THRESHOLD ? 0 : 150;
          return (
            <View key={group.brandId} style={styles.brandSection}>
              <View style={styles.brandHeader}>
                <View>
                  <Text style={styles.brandName}>{group.brandName}</Text>
                  <Text style={styles.brandItemCount}>{group.items.length} item(s)</Text>
                </View>
                <View>
                  {brandShipping === 0 ? (
                    <Text style={styles.freeShippingBadge}>Free Shipping</Text>
                  ) : (
                    <Text style={styles.shippingText}>{CURRENCY} 150 shipping</Text>
                  )}
                </View>
              </View>

              {group.items.map((item) => (
                <View key={item.itemId} style={styles.itemCard}>
                  <Image source={{ uri: item.productImage }} style={styles.itemImage} />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                    <View style={styles.itemMetaRow}>
                      {item.size && <View style={styles.metaBadge}><Text style={styles.metaBadgeText}>Size: {item.size}</Text></View>}
                      {item.color && (
                        <View style={styles.metaBadge}>
                          <View style={[styles.colorDot, { backgroundColor: item.colorCode || '#888' }]} />
                          <Text style={styles.metaBadgeText}>{item.color}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemPrice}>{CURRENCY} {item.unitPrice.toLocaleString()}</Text>
                  </View>
                  <View style={styles.itemActions}>
                    <View style={styles.quantityRow}>
                      <TouchableOpacity style={[styles.qtyBtn, item.quantity <= 1 && styles.qtyBtnDisabled]} disabled={item.quantity <= 1} onPress={() => handleUpdateQuantity(item.itemId, -1)}>
                        <Minus size={14} stroke={item.quantity <= 1 ? Colors.text.tertiary : Colors.text.primary} strokeWidth={2} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateQuantity(item.itemId, 1)}>
                        <Plus size={14} stroke={Colors.text.primary} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => Alert.alert('Remove Item', 'Remove this item?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => handleRemoveItem(item.itemId) },
                    ])}>
                      <Trash2 size={14} stroke={ShopColors.danger} strokeWidth={1.75} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.brandSubtotalRow}>
                <Text style={styles.brandSubtotalLabel}>Subtotal</Text>
                <Text style={styles.brandSubtotalValue}>{CURRENCY} {brandSub.toLocaleString()}</Text>
              </View>
            </View>
          );
        })}

        <View style={styles.couponSection}>
          {appliedCoupon ? (
            <View style={styles.couponApplied}>
              <View style={styles.couponAppliedLeft}>
                <Tag size={16} stroke={ShopColors.primary} strokeWidth={2} />
                <View>
                  <Text style={styles.couponCode}>{appliedCoupon.code}</Text>
                  <Text style={styles.couponSavings}>You saved {CURRENCY} {couponDiscount.toLocaleString()}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon}>
                <X size={18} stroke={Colors.text.tertiary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {!showCouponInput ? (
                <TouchableOpacity style={styles.couponBtn} onPress={() => setShowCouponInput(true)}>
                  <Tag size={16} stroke={ShopColors.primary} strokeWidth={2} />
                  <Text style={styles.couponBtnText}>Apply Coupon Code</Text>
                  <ArrowRight size={16} stroke={Colors.text.tertiary} strokeWidth={2} />
                </TouchableOpacity>
              ) : (
                <View style={styles.couponInputRow}>
                  <TextInput style={styles.couponInput} placeholder="Enter coupon code" placeholderTextColor={Colors.text.tertiary} value={couponInput} onChangeText={setCouponInput} autoCapitalize="characters" autoCorrect={false} />
                  <TouchableOpacity style={[styles.couponApplyBtn, (!couponInput.trim() || loading) && styles.couponApplyBtnDisabled]} disabled={!couponInput.trim() || loading} onPress={handleApplyCoupon}>
                    <Text style={styles.couponApplyBtnText}>{loading ? '...' : 'Apply'}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {error && <Text style={styles.couponError}>{error}</Text>}
            </>
          )}
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{CURRENCY} {cart.subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={[styles.summaryValue, cart.shippingFee === 0 && styles.freeText]}>
              {cart.shippingFee === 0 ? 'Free' : `${CURRENCY} ${cart.shippingFee.toLocaleString()}`}
            </Text>
          </View>
          {appliedCoupon && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>Coupon Discount ({appliedCoupon.code})</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>- {CURRENCY} {couponDiscount.toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{CURRENCY} {total.toLocaleString()}</Text>
          </View>
          <Text style={styles.taxNote}>Taxes included where applicable</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceWrap}>
          <Text style={styles.bottomPriceLabel}>Total</Text>
          <Text style={styles.bottomPrice}>{CURRENCY} {total.toLocaleString()}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <ArrowRight size={18} stroke="#FFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: (StatusBar.currentHeight || 0) + 20, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  clearBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text.primary, marginTop: Spacing.lg },
  emptySubtitle: { fontSize: 14, color: Colors.text.tertiary, textAlign: 'center', marginTop: Spacing.sm, maxWidth: 260 },
  browseBtn: { marginTop: Spacing.xl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: ShopColors.primary, borderRadius: BorderRadius.lg },
  browseBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  brandSection: { backgroundColor: Colors.surface, marginTop: Spacing.xs, paddingBottom: Spacing.md },
  brandHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  brandName: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  brandItemCount: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
  freeShippingBadge: { fontSize: 11, fontWeight: '600', color: ShopColors.success, backgroundColor: '#E8F8F0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.xs },
  shippingText: { fontSize: 12, color: Colors.text.tertiary },

  itemCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  itemImage: { width: 72, height: 88, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundAlt },
  itemInfo: { flex: 1, marginLeft: Spacing.md },
  itemName: { fontSize: 14, fontWeight: '500', color: Colors.text.primary, lineHeight: 19 },
  itemMetaRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.backgroundAlt, paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.xs },
  metaBadgeText: { fontSize: 10, color: Colors.text.secondary },
  colorDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: Colors.borderDark },
  itemPrice: { fontSize: 14, fontWeight: '600', color: ShopColors.primary, marginTop: 4 },
  itemActions: { alignItems: 'center', gap: Spacing.sm },
  quantityRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md },
  qtyBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyText: { fontSize: 13, fontWeight: '600', color: Colors.text.primary, width: 26, textAlign: 'center' },
  removeBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  brandSubtotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  brandSubtotalLabel: { fontSize: 13, fontWeight: '500', color: Colors.text.secondary },
  brandSubtotalValue: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },

  couponSection: { backgroundColor: Colors.surface, marginTop: Spacing.xs, padding: Spacing.lg },
  couponBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, borderStyle: 'dashed' },
  couponBtnText: { fontSize: 14, fontWeight: '600', color: Colors.text.primary, flex: 1, marginLeft: Spacing.sm },
  couponInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  couponInput: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: 14, color: Colors.text.primary, backgroundColor: Colors.surface },
  couponApplyBtn: { backgroundColor: ShopColors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  couponApplyBtnDisabled: { backgroundColor: Colors.borderDark },
  couponApplyBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  couponApplied: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: ShopColors.primaryLight, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: ShopColors.primary + '40' },
  couponAppliedLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  couponCode: { fontSize: 14, fontWeight: '700', color: ShopColors.primary },
  couponSavings: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  couponError: { fontSize: 12, color: ShopColors.danger, marginTop: Spacing.sm },

  summarySection: { backgroundColor: Colors.surface, marginTop: Spacing.xs, padding: Spacing.lg },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 14, color: Colors.text.secondary },
  summaryValue: { fontSize: 14, fontWeight: '500', color: Colors.text.primary },
  freeText: { color: ShopColors.success, fontWeight: '600' },
  discountLabel: { color: ShopColors.success },
  discountValue: { color: ShopColors.success, fontWeight: '600' },
  summaryDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.sm },
  totalLabel: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  totalValue: { fontSize: 18, fontWeight: '700', color: ShopColors.primary },
  taxNote: { fontSize: 11, color: Colors.text.tertiary, marginTop: Spacing.sm },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.borderLight, gap: Spacing.lg, ...Shadows.medium },
  bottomPriceWrap: { flex: 1 },
  bottomPriceLabel: { fontSize: 11, color: Colors.text.tertiary },
  bottomPrice: { fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: ShopColors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm, flex: 1.5 },
  checkoutBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

export default CartScreen;
