import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowRight, ChevronLeft, Edit3, MapPin, Truck, CreditCard, ShoppingBag, AlertCircle } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { clearError, placeOrder, selectCheckoutError, selectCheckoutOrderSummary, selectCheckoutPlacing } from './checkoutReviewSlice';

const CheckoutReviewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const summary = useAppSelector(selectCheckoutOrderSummary);
  const placing = useAppSelector(selectCheckoutPlacing);
  const error = useAppSelector(selectCheckoutError);

  const handlePlaceOrder = useCallback(async () => {
    try {
      const result = await dispatch(placeOrder()).unwrap();
      Alert.alert('Order placed', `Your order ${result.orderId} has been created successfully.`);
      navigation.navigate(ShoppingRouteNames.OrderConfirmation, { orderId: result.orderId });
    } catch (err) {
      dispatch(clearError());
    }
  }, [dispatch, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Checkout</Text>
          <Text style={styles.headerSubtitle}>Step 4 of 4</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.stepCard}>
        <View style={styles.stepRow}>
          <Text style={styles.stepLabelDone}>Address</Text>
          <Text style={styles.stepLabelDone}>Delivery</Text>
          <Text style={styles.stepLabelDone}>Payment</Text>
          <Text style={styles.stepLabel}>Review</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            <ShoppingBag size={16} stroke={Colors.primary} strokeWidth={2} />
          </View>
          {summary.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>PKR {(item.price * item.quantity).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate(ShoppingRouteNames.Checkout)}>
              <Edit3 size={14} stroke={Colors.primary} strokeWidth={2} />
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={16} stroke={Colors.primary} strokeWidth={2} />
            <Text style={styles.infoText}>{summary.deliveryAddress}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Option</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate(ShoppingRouteNames.CheckoutDelivery)}>
              <Edit3 size={14} stroke={Colors.primary} strokeWidth={2} />
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Truck size={16} stroke={Colors.primary} strokeWidth={2} />
            <Text style={styles.infoText}>{summary.deliveryOption}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate(ShoppingRouteNames.CheckoutPayment)}>
              <Edit3 size={14} stroke={Colors.primary} strokeWidth={2} />
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <CreditCard size={16} stroke={Colors.primary} strokeWidth={2} />
            <Text style={styles.infoText}>{summary.paymentMethod}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Subtotal</Text>
            <Text style={styles.breakdownValue}>PKR {summary.subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Delivery</Text>
            <Text style={styles.breakdownValue}>PKR {summary.deliveryFee.toLocaleString()}</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>PKR {summary.total.toLocaleString()}</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <AlertCircle size={16} stroke={Colors.error} strokeWidth={2} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.placeBtn, placing && styles.placeBtnDisabled]} disabled={placing} onPress={handlePlaceOrder}>
          <Text style={styles.placeBtnText}>{placing ? 'Placing Order...' : 'Place Order'}</Text>
          <ArrowRight size={16} stroke="#FFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', ...Shadows.sm },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  headerSubtitle: { marginTop: 2, fontSize: 12, color: Colors.text.tertiary },
  stepCard: { marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: '#FFF', ...Shadows.sm },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  stepLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  stepLabelDone: { fontSize: 12, color: Colors.primary, opacity: 0.85 },
  progressBar: { height: 8, borderRadius: 999, backgroundColor: '#F4F4F5', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 999 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 120 },
  section: { marginBottom: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.xl, backgroundColor: '#FFF', ...Shadows.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.primary },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemName: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  itemMeta: { fontSize: 12, color: Colors.text.tertiary, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: Colors.text.primary },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { flex: 1, fontSize: 13, color: Colors.text.secondary, lineHeight: 18 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  breakdownLabel: { fontSize: 13, color: Colors.text.secondary },
  breakdownValue: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  breakdownDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: Spacing.sm },
  totalLabel: { fontSize: 15, fontWeight: '800', color: Colors.text.primary },
  totalValue: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: '#FEF2F2' },
  errorText: { flex: 1, fontSize: 12, color: Colors.error },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  placeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.xl },
  placeBtnDisabled: { opacity: 0.45 },
  placeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});

export default CheckoutReviewScreen;