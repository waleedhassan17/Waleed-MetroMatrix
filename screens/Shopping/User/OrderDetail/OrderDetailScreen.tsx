import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, MapPin, CreditCard, PackageX, Truck, Star, RotateCcw } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../../../constants/Colors';
import { ShoppingRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { cancelSubOrder, clearOrderDetail, fetchOrderDetail, selectOrderDetail } from './orderDetailSlice';
import type { Order, OrderStatus } from '../../../../types/shopping';

const ShopColors = { primary: '#E67E22', primaryLight: '#FFF3E6', success: '#27AE60', danger: '#E74C3C' };
const CURRENCY = 'PKR';

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  processing: '#8B5CF6',
  shipped: '#0EA5E9',
  out_for_delivery: '#06B6D4',
  delivered: '#27AE60',
  cancelled: '#E74C3C',
  returned: '#F97316',
  refunded: '#6B7280',
};

const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { group, loading, error, cancelling } = useAppSelector(selectOrderDetail);
  const orderId = route.params?.orderId as string;

  useEffect(() => {
    if (orderId) dispatch(fetchOrderDetail(orderId));
    return () => {
      dispatch(clearOrderDetail());
    };
  }, [dispatch, orderId]);

  const handleCancel = useCallback((order: Order) => {
    Alert.alert('Cancel Order', `Cancel the ${order.items.length}-item order from this brand?`, [
      { text: 'Keep Order', style: 'cancel' },
      {
        text: 'Cancel Order',
        style: 'destructive',
        onPress: async () => {
          const result = await dispatch(
            cancelSubOrder({ orderId: order.orderId, reason: 'Cancelled by customer' })
          );
          if (cancelSubOrder.rejected.match(result)) {
            Alert.alert('Could not cancel order', (result.payload as string) || 'Please try again.');
          }
        },
      },
    ]);
  }, [dispatch]);

  const canCancel = (status: OrderStatus) => status === 'pending' || status === 'confirmed';
  const canReturn = (status: OrderStatus) => status === 'delivered';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={Colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !group && (
        <View style={styles.center}><ActivityIndicator color={ShopColors.primary} size="large" /></View>
      )}

      {error && !group && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchOrderDetail(orderId))}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {group && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.orderCode}>{group.odexId}</Text>
            <Text style={styles.orderDate}>
              Placed {new Date(group.createdAt).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            {group.orders.length > 1 && (
              <Text style={styles.multiNote}>
                This order contains items from {group.orders.length} brands — each ships separately.
              </Text>
            )}
          </View>

          {group.orders.map((order) => (
            <View key={order.orderId} style={styles.card}>
              <View style={styles.subHeader}>
                <Text style={styles.brandName}>{(order as any).brandName || 'Brand order'}</Text>
                <View style={[styles.statusChip, { backgroundColor: `${STATUS_COLORS[order.orderStatus]}20` }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[order.orderStatus] }]}>
                    {order.orderStatus.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              {order.trackingNumber ? (
                <Text style={styles.tracking}>Tracking: {order.trackingNumber}</Text>
              ) : null}

              {order.items.map((item) => (
                <View key={item.itemId} style={styles.itemRow}>
                  {item.productImage ? (
                    <Image source={{ uri: item.productImage }} style={styles.itemImage} />
                  ) : (
                    <View style={[styles.itemImage, styles.itemImageFallback]} />
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                    {item.variantLabel ? <Text style={styles.itemVariant}>{item.variantLabel}</Text> : null}
                    <Text style={styles.itemQty}>x{item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>{CURRENCY} {item.totalPrice.toLocaleString()}</Text>
                </View>
              ))}

              <View style={styles.subTotals}>
                <Text style={styles.subTotalText}>Subtotal {CURRENCY} {order.subtotal.toLocaleString()}</Text>
                {order.discount > 0 && (
                  <Text style={styles.subTotalText}>Discount −{CURRENCY} {order.discount.toLocaleString()}</Text>
                )}
                <Text style={styles.subTotalText}>Shipping {CURRENCY} {order.shippingFee.toLocaleString()}</Text>
                <Text style={styles.subTotalBold}>Total {CURRENCY} {order.total.toLocaleString()}</Text>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate(ShoppingRouteNames.OrderTracking, { orderId: order.orderId })}
                >
                  <Truck size={16} stroke={ShopColors.primary} strokeWidth={2} />
                  <Text style={styles.actionText}>Track</Text>
                </TouchableOpacity>

                {canCancel(order.orderStatus) && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    disabled={cancelling === order.orderId}
                    onPress={() => handleCancel(order)}
                  >
                    <PackageX size={16} stroke={ShopColors.danger} strokeWidth={2} />
                    <Text style={[styles.actionText, { color: ShopColors.danger }]}>
                      {cancelling === order.orderId ? 'Cancelling…' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                )}

                {canReturn(order.orderStatus) && (
                  <>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => navigation.navigate(ShoppingRouteNames.ReturnRequest, { orderId: order.orderId })}
                    >
                      <RotateCcw size={16} stroke={ShopColors.primary} strokeWidth={2} />
                      <Text style={styles.actionText}>Return</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() =>
                        navigation.navigate(ShoppingRouteNames.WriteReview, {
                          productId: order.items[0]?.productId,
                        })
                      }
                    >
                      <Star size={16} stroke={ShopColors.primary} strokeWidth={2} />
                      <Text style={styles.actionText}>Review</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ))}

          <View style={styles.card}>
            <View style={styles.metaRow}>
              <MapPin size={16} stroke={Colors.text.secondary} strokeWidth={2} />
              <View style={styles.metaText}>
                <Text style={styles.metaTitle}>{group.shippingAddress.fullName} · {group.shippingAddress.phone}</Text>
                <Text style={styles.metaSub}>
                  {group.shippingAddress.addressLine1}
                  {group.shippingAddress.addressLine2 ? `, ${group.shippingAddress.addressLine2}` : ''}, {group.shippingAddress.city}
                </Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <CreditCard size={16} stroke={Colors.text.secondary} strokeWidth={2} />
              <View style={styles.metaText}>
                <Text style={styles.metaTitle}>
                  {group.paymentMethod === 'wallet' ? 'MetroMatrix Wallet' : 'Cash on Delivery'} · {group.paymentStatus}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{CURRENCY} {group.subtotal.toLocaleString()}</Text></View>
            {group.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount{group.appliedCoupon ? ` (${group.appliedCoupon})` : ''}</Text>
                <Text style={[styles.totalValue, { color: ShopColors.success }]}>−{CURRENCY} {group.discount.toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Shipping</Text><Text style={styles.totalValue}>{CURRENCY} {group.shippingFee.toLocaleString()}</Text></View>
            <View style={[styles.totalRow, styles.grandRow]}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>{CURRENCY} {group.total.toLocaleString()}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  errorText: { color: Colors.text.secondary, textAlign: 'center', marginBottom: Spacing.md },
  retryBtn: { backgroundColor: ShopColors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  orderCode: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  orderDate: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  multiNote: { fontSize: 12, color: ShopColors.primary, marginTop: Spacing.sm, backgroundColor: ShopColors.primaryLight, padding: Spacing.sm, borderRadius: BorderRadius.sm },
  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  brandName: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  statusChip: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  tracking: { fontSize: 12, color: Colors.text.secondary, marginBottom: Spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  itemImage: { width: 48, height: 48, borderRadius: BorderRadius.sm, backgroundColor: Colors.background },
  itemImageFallback: { backgroundColor: '#EEE' },
  itemInfo: { flex: 1, marginHorizontal: Spacing.md },
  itemName: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  itemVariant: { fontSize: 12, color: Colors.text.secondary },
  itemQty: { fontSize: 12, color: Colors.text.tertiary },
  itemPrice: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  subTotals: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  subTotalText: { fontSize: 12, color: Colors.text.secondary, textAlign: 'right' },
  subTotalBold: { fontSize: 13, fontWeight: '700', color: Colors.text.primary, textAlign: 'right', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 8 },
  actionText: { fontSize: 13, fontWeight: '600', color: ShopColors.primary },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  metaText: { flex: 1 },
  metaTitle: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  metaSub: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  totalLabel: { fontSize: 13, color: Colors.text.secondary },
  totalValue: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  grandRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  grandLabel: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  grandValue: { fontSize: 15, fontWeight: '800', color: ShopColors.primary },
});

export default OrderDetailScreen;
