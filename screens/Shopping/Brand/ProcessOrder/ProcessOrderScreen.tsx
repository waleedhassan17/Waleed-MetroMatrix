import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader,
  Package,
  Truck,
  XCircle,
  MapPin,
  CreditCard,
  FileText,
} from 'lucide-react-native';
import { Shadows } from '../../../../constants/Colors';
import { BrandRouteNames } from '../../../../navigation-maps/Shopping';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { selectBrandOrderById, updateOrderStatus } from '../BrandOrders/brandOrdersSlice';
import { resetProcessOrder, selectProcessOrder, setCarrier, setNotes, setSaving, setTrackingNumber } from './processOrderSlice';

const STATUS_BAR_H = Platform.OS === 'android' ? StatusBar.currentHeight || 44 : 44;

const B = {
  primary: '#E67E22',
  primaryLight: '#FFF5EB',
  surface: '#FFFFFF',
  bg: '#F8F9FA',
  text: '#1A1A2E',
  textSec: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#F0F0F0',
  success: '#10B981',
  successLight: '#ECFDF5',
  info: '#3B82F6',
  infoLight: '#EFF6FF',
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  warning: '#D97706',
  warningLight: '#FFFBEB',
};

const STATUS_META: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  pending: { color: B.warning, bg: B.warningLight, icon: Clock, label: 'Pending' },
  confirmed: { color: B.info, bg: B.infoLight, icon: CheckCircle2, label: 'Confirmed' },
  processing: { color: B.info, bg: B.infoLight, icon: Loader, label: 'Processing' },
  shipped: { color: B.purple, bg: B.purpleLight, icon: Truck, label: 'Shipped' },
  out_for_delivery: { color: B.purple, bg: B.purpleLight, icon: Truck, label: 'Out for Delivery' },
  delivered: { color: B.success, bg: B.successLight, icon: CheckCircle2, label: 'Delivered' },
  cancelled: { color: B.error, bg: B.errorLight, icon: XCircle, label: 'Cancelled' },
  returned: { color: B.warning, bg: B.warningLight, icon: XCircle, label: 'Returned' },
  refunded: { color: B.textMuted, bg: B.bg, icon: XCircle, label: 'Refunded' },
};

// Mirrors the backend's ALLOWED_TRANSITIONS (orderService.js) exactly — the
// vendor must only ever be offered a transition the server will actually
// accept. cancelled/returned/refunded have no further vendor-driven moves.
type NextStatus = 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
const NEXT_ACTIONS: Record<string, { status: NextStatus; label: string; color: string; icon: any }[]> = {
  pending: [
    { status: 'confirmed', label: 'Confirm', color: B.info, icon: CheckCircle2 },
    { status: 'cancelled', label: 'Cancel', color: B.error, icon: XCircle },
  ],
  confirmed: [
    { status: 'processing', label: 'Processing', color: B.info, icon: Loader },
    { status: 'cancelled', label: 'Cancel', color: B.error, icon: XCircle },
  ],
  processing: [
    { status: 'shipped', label: 'Shipped', color: B.purple, icon: Truck },
    { status: 'cancelled', label: 'Cancel', color: B.error, icon: XCircle },
  ],
  shipped: [{ status: 'out_for_delivery', label: 'Out for Delivery', color: B.purple, icon: Truck }],
  out_for_delivery: [{ status: 'delivered', label: 'Delivered', color: B.success, icon: CheckCircle2 }],
};

const ProcessOrderScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const orderId = route.params?.orderId as string;
  const order = useAppSelector(selectBrandOrderById(orderId));
  const { carrier, notes, saving, trackingNumber } = useAppSelector(selectProcessOrder);

  useEffect(() => {
    return () => { dispatch(resetProcessOrder()); };
  }, [dispatch]);

  const handleUpdate = async (nextStatus: NextStatus) => {
    if (nextStatus === 'shipped' && !trackingNumber.trim()) {
      Alert.alert('Tracking number required', 'Enter a tracking number before marking this order shipped.');
      return;
    }
    dispatch(setSaving(true));
    const result = await dispatch(
      updateOrderStatus({
        orderId,
        orderStatus: nextStatus,
        trackingNumber: trackingNumber || undefined,
        note: notes || undefined,
      })
    );
    dispatch(setSaving(false));
    if (updateOrderStatus.rejected.match(result)) {
      Alert.alert('Could not update order', (result.payload as string) || 'Please try again.');
      return;
    }
    Alert.alert('Order Updated', `Status changed to "${nextStatus}".`);
    navigation.navigate(BrandRouteNames.BrandOrders);
  };

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} stroke={B.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.title}>Order Not Found</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Package size={32} stroke={B.textMuted} strokeWidth={1.5} />
          <Text style={styles.emptyText}>This order could not be found.</Text>
        </View>
      </View>
    );
  }

  const currentStatus = STATUS_META[order.orderStatus] || STATUS_META.pending;
  const CurrentIcon = currentStatus.icon;
  const nextActions = NEXT_ACTIONS[order.orderStatus] || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={B.surface} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} stroke={B.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{order.orderId}</Text>
          <Text style={styles.subtitle}>Process Order</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: currentStatus.bg }]}>
          <CurrentIcon size={12} stroke={currentStatus.color} strokeWidth={2} />
          <Text style={[styles.statusBadgeText, { color: currentStatus.color }]}>{currentStatus.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Customer & Payment */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.cardIcon, { backgroundColor: B.primaryLight }]}>
              <MapPin size={16} stroke={B.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Ship to</Text>
              <Text style={styles.cardValue}>{order.shippingAddress.fullName}</Text>
              <Text style={styles.cardMeta}>{order.shippingAddress.addressLine1}{order.shippingAddress.city ? `, ${order.shippingAddress.city}` : ''}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.cardRow}>
            <View style={[styles.cardIcon, { backgroundColor: B.infoLight }]}>
              <CreditCard size={16} stroke={B.info} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Payment</Text>
              <Text style={styles.cardValue}>{order.paymentMethod} · {order.paymentStatus}</Text>
            </View>
            <Text style={styles.totalText}>₨{order.total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
          {order.items.map((item, idx) => (
            <View key={item.itemId} style={[styles.itemRow, idx < order.items.length - 1 && styles.itemBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemVariant}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>₨{(item.quantity * item.unitPrice).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Tracking */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <FileText size={16} stroke={B.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Shipping & Notes</Text>
          </View>
          <Text style={styles.inputLabel}>Tracking Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1Z999AA10123456784"
            placeholderTextColor={B.textMuted}
            value={trackingNumber}
            onChangeText={(text) => dispatch(setTrackingNumber(text))}
          />
          <Text style={styles.inputLabel}>Carrier</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. TCS, Leopards, FedEx"
            placeholderTextColor={B.textMuted}
            value={carrier}
            onChangeText={(text) => dispatch(setCarrier(text))}
          />
          <Text style={styles.inputLabel}>Internal Notes</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Add any internal notes..."
            placeholderTextColor={B.textMuted}
            value={notes}
            onChangeText={(text) => dispatch(setNotes(text))}
            multiline
          />
        </View>

        {/* Actions — only transitions the backend will actually accept from this order's current status */}
        {nextActions.length > 0 ? (
          <View style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>Update Status</Text>
            <View style={styles.actionsGrid}>
              {nextActions.map((action) => {
                const Icon = action.icon;
                return (
                  <TouchableOpacity
                    key={action.status}
                    style={[styles.actionBtn, { backgroundColor: action.color }]}
                    disabled={saving}
                    onPress={() => handleUpdate(action.status)}
                  >
                    <Icon size={16} stroke="#FFF" strokeWidth={2} />
                    <Text style={styles.actionText}>{action.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>Update Status</Text>
            <Text style={styles.emptyText}>This order is in a final state — no further status changes are possible.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: B.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: STATUS_BAR_H + 10,
    paddingBottom: 12,
    backgroundColor: B.surface,
    borderBottomWidth: 1,
    borderBottomColor: B.border,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.bg,
  },
  headerCenter: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: B.text },
  subtitle: { fontSize: 12, fontWeight: '600', color: B.textMuted, marginTop: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },

  // Card
  card: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: B.surface,
    ...Shadows.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: { fontSize: 11, fontWeight: '600', color: B.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  cardValue: { fontSize: 14, fontWeight: '700', color: B.text, marginTop: 1 },
  cardMeta: { fontSize: 12, color: B.textMuted, marginTop: 1 },
  totalText: { fontSize: 16, fontWeight: '800', color: B.text },
  divider: { height: 1, backgroundColor: B.border, marginVertical: 12 },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: B.text, marginBottom: 4 },

  // Items
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: B.border },
  itemName: { fontSize: 14, fontWeight: '700', color: B.text },
  itemVariant: { fontSize: 12, color: B.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: B.text },

  // Inputs
  inputLabel: { fontSize: 12, fontWeight: '700', color: B.textSec, marginBottom: 6, marginTop: 4 },
  input: {
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    backgroundColor: B.bg,
    color: B.text,
    fontSize: 14,
  },
  multiline: { height: 90, textAlignVertical: 'top', paddingTop: 12 },

  // Actions
  actionsCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: B.surface,
    ...Shadows.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // Empty
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 14, color: B.textMuted },
});

export default ProcessOrderScreen;