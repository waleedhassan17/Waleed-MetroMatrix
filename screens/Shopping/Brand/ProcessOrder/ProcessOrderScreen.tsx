import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  CheckCircle2,
  Clock,
  Loader,
  Package,
  Truck,
  XCircle,
  MapPin,
  CreditCard,
  FileText,
  Save,
} from 'lucide-react-native';
import { Shadows } from '../../../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { selectBrandOrderById, updateOrderStatus, upsertOrder } from '../BrandOrders/brandOrdersSlice';
import {
  hydrateFromOrder,
  resetProcessOrder,
  saveShipping,
  selectProcessOrder,
  setCarrier,
  setCustomerNote,
  setInternalNotes,
  setSaving,
  setTrackingNumber,
} from './processOrderSlice';
import { B, formatOrderNumber } from '../theme';
import BrandHeader from '../BrandHeader';
import { ThemeColors, useTheme } from '../../../../theme';
import { C, T, W } from '../../../../constants/theme';

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
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const orderId = route.params?.orderId as string;
  const order = useAppSelector(selectBrandOrderById(orderId));
  const { carrier, internalNotes, customerNote, saving, trackingNumber } =
    useAppSelector(selectProcessOrder);

  // Seed the shipping inputs from the order. Their absence was the whole of the
  // "tracking number disappears when the state changes" bug: the value was
  // saved and preserved server-side all along, but this form started blank
  // every time, so reopening a shipped order looked like the data was gone.
  useEffect(() => {
    if (!order) return;
    dispatch(
      hydrateFromOrder({
        orderId: order.orderId,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        internalNotes: order.internalNotes,
      })
    );
  }, [dispatch, order?.orderId, order?.trackingNumber, order?.carrier, order?.internalNotes]);

  useEffect(() => {
    return () => { dispatch(resetProcessOrder()); };
  }, [dispatch]);

  /** Shipping paperwork, saved on its own — no status change required. */
  const handleSaveShipping = async () => {
    const result = await dispatch(
      saveShipping({ orderId, trackingNumber, carrier, internalNotes })
    );
    if (saveShipping.rejected.match(result)) {
      Alert.alert('Could not save', (result.payload as string) || 'Please try again.');
      return;
    }
    dispatch(upsertOrder(result.payload as any));
    Alert.alert('Saved', 'Shipping details have been saved.');
  };

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
        carrier: carrier || undefined,
        // statusHistory is the shopper-visible timeline, so only the note
        // explicitly addressed to them goes here. internalNotes is saved
        // separately by the shipping endpoint and never leaves the vendor.
        note: customerNote || undefined,
      })
    );
    dispatch(setSaving(false));
    if (updateOrderStatus.rejected.match(result)) {
      Alert.alert('Could not update order', (result.payload as string) || 'Please try again.');
      return;
    }
    Alert.alert('Order Updated', `Status changed to "${nextStatus}".`);
    // goBack, not navigate: BrandOrders is registered both as a tab and as a
    // sibling stack route, and navigate() resolved to the stack copy — pushing
    // a second, tab-bar-less Orders screen instead of returning to the tab.
    navigation.goBack();
  };

  if (!order) {
    return (
      <View style={styles.container}>
        <BrandHeader title="Order Not Found" showBack />
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
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={B.surface} />

      <BrandHeader
        title="Process Order"
        subtitle={formatOrderNumber(order.odexId || order.orderId)}
        showBack
        actions={
          <View style={[styles.statusBadge, { backgroundColor: currentStatus.bg }]}>
            <CurrentIcon size={12} stroke={currentStatus.color} strokeWidth={2} />
            <Text style={[styles.statusBadgeText, { color: currentStatus.color }]}>{currentStatus.label}</Text>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Customer & Payment */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.cardIcon, { backgroundColor: colors.accentSoft }]}>
              <MapPin size={16} stroke={colors.accent} strokeWidth={2} />
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
          </View>

          {/* A single total could not be reconciled against anything — a vendor
              looking at ₨3,440 had no way to see it was ₨3,190 of goods plus
              ₨250 of Express. The delivery tier is named because it is a
              fulfilment instruction, not just a line of money.

              The tier's own `surcharge` is deliberately NOT printed: on a
              multi-brand order checkout splits it proportionally across the
              brands, so this order's shippingFee is its real share of it. */}
          <View style={styles.breakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Subtotal</Text>
              <Text style={styles.breakdownValue}>₨{order.subtotal.toLocaleString()}</Text>
            </View>
            {order.discount > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Discount</Text>
                <Text style={[styles.breakdownValue, { color: B.success }]}>
                  −₨{order.discount.toLocaleString()}
                </Text>
              </View>
            )}
            <View style={styles.breakdownRow}>
              <View style={styles.deliveryLabelWrap}>
                <Text style={styles.breakdownLabel}>Shipping &amp; delivery</Text>
                {!!order.deliveryOption && (
                  <View style={[styles.speedChip, { backgroundColor: B.purpleLight }]}>
                    <Truck size={11} stroke={B.purple} strokeWidth={2} />
                    <Text style={[styles.speedChipText, { color: B.purple }]}>
                      {order.deliveryOption.name}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.breakdownValue}>₨{order.shippingFee.toLocaleString()}</Text>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
              <Text style={styles.breakdownTotalLabel}>Total</Text>
              <Text style={styles.totalText}>₨{order.total.toLocaleString()}</Text>
            </View>
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
            <FileText size={16} stroke={colors.accent} strokeWidth={2} />
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
          <Text style={styles.inputHint}>Only your team sees this.</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Add any internal notes..."
            placeholderTextColor={B.textMuted}
            value={internalNotes}
            onChangeText={(text) => dispatch(setInternalNotes(text))}
            multiline
          />

          {/* Saveable on its own. These three used to persist only as a side
              effect of a status change, so on a delivered or cancelled order —
              where no transition is left — they could be typed but never
              stored, and a mistyped tracking number could never be corrected. */}
          <TouchableOpacity
            style={[styles.saveShippingBtn, saving && { opacity: 0.6 }]}
            disabled={saving}
            onPress={handleSaveShipping}
          >
            <Save size={15} stroke={C.surface} strokeWidth={2} />
            <Text style={styles.saveShippingText}>
              {saving ? 'Saving…' : 'Save shipping info'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Actions — only transitions the backend will actually accept from this order's current status */}
        {nextActions.length > 0 ? (
          <View style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>Update Status</Text>
            {/* This one really does reach the shopper: it is appended to
                statusHistory, which the order-tracking endpoint serves them. */}
            <Text style={styles.inputLabel}>Note to customer (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Shown on their order tracking"
              placeholderTextColor={B.textMuted}
              value={customerNote}
              onChangeText={(text) => dispatch(setCustomerNote(text))}
            />
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
                    <Icon size={16} stroke={C.surface} strokeWidth={2} />
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

// Built per render from the resolved theme so a brand's colours reach
// rules that live at module scope. Layout, spacing and type are unchanged.
const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: B.bg },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusBadgeText: { ...T.caption, fontWeight: W.bold },
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
  cardLabel: { ...T.caption, fontWeight: W.semibold, color: B.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  cardValue: { ...T.body, fontWeight: W.bold, color: B.text, marginTop: 1 },
  cardMeta: { ...T.caption, color: B.textMuted, marginTop: 1 },
  totalText: { ...T.subhead, fontWeight: W.bold, color: B.text },
  divider: { height: 1, backgroundColor: B.border, marginVertical: 12 },

  // Payment breakdown
  breakdown: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: B.border },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 8,
  },
  breakdownLabel: { ...T.body, color: B.textSec },
  breakdownValue: { ...T.body, color: B.text },
  breakdownTotalRow: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: B.border },
  breakdownTotalLabel: { ...T.body, fontWeight: W.bold, color: B.text },
  deliveryLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  speedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  speedChipText: { ...T.caption, fontWeight: W.bold },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { ...T.body, fontWeight: W.bold, color: B.text, marginBottom: 4 },

  // Items
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: B.border },
  itemName: { ...T.body, fontWeight: W.bold, color: B.text },
  itemVariant: { ...T.caption, color: B.textMuted, marginTop: 2 },
  itemPrice: { ...T.body, fontWeight: W.bold, color: B.text },

  // Inputs
  inputLabel: { ...T.caption, fontWeight: W.bold, color: B.textSec, marginBottom: 6, marginTop: 4 },
  input: {
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    backgroundColor: B.bg,
    color: B.text,
    ...T.body,

  },
  multiline: { height: 90, textAlignVertical: 'top', paddingTop: 12 },
  inputHint: { ...T.caption, color: B.textMuted, marginBottom: 6, marginTop: -2 },
  saveShippingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: c.accent,
  },
  saveShippingText: { color: C.surface, ...T.label, fontWeight: W.bold },

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
  actionText: { color: C.surface, ...T.label, fontWeight: W.bold },

  // Empty
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { ...T.body, color: B.textMuted },
});

export default ProcessOrderScreen;