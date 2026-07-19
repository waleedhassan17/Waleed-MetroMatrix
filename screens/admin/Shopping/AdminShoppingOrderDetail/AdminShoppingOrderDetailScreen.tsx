import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, ShieldAlert, Banknote } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  adminForceStatus,
  adminRefund,
  clearAdminOrderDetail,
  fetchAdminOrderDetail,
  selectAdminShoppingOrderDetail,
} from './adminShoppingOrderDetailSlice';

const COLORS = {
  primary: '#E67E22',
  danger: '#E74C3C',
  success: '#27AE60',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};
const CURRENCY = 'PKR';

const NEXT_STATUSES: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: ['returned'],
  returned: ['refunded'],
  cancelled: [],
  refunded: [],
};

const AdminShoppingOrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { order, loading, acting, error } = useAppSelector(selectAdminShoppingOrderDetail);
  const orderId = route.params?.orderId as string;
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (orderId) dispatch(fetchAdminOrderDetail(orderId));
    return () => {
      dispatch(clearAdminOrderDetail());
    };
  }, [dispatch, orderId]);

  const requireReason = (): string | null => {
    if (!reason.trim()) {
      Alert.alert('Reason required', 'Admin actions are audited — enter a reason first.');
      return null;
    }
    return reason.trim();
  };

  const handleForce = (status: string) => {
    const r = requireReason();
    if (!r) return;
    Alert.alert(
      'Force status change',
      `Move this order to "${status.replace(/_/g, ' ')}"?\n\nThis action is recorded in the audit log with your admin ID.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => dispatch(adminForceStatus({ orderId, status, reason: r })),
        },
      ]
    );
  };

  const handleRefund = () => {
    const r = requireReason();
    if (!r) return;
    Alert.alert(
      'Manual refund',
      `Refund ${CURRENCY} ${order?.total.toLocaleString()} to the customer's wallet?\n\nThis action is recorded in the audit log.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Refund', style: 'destructive', onPress: () => dispatch(adminRefund({ orderId, reason: r })) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={COLORS.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Order Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !order && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />}
      {error && !order && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchAdminOrderDetail(orderId))}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {order && (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.orderCode}>{order.odexId}</Text>
            <Text style={styles.metaLine}>Brand: {order.brandName || order.brandId}</Text>
            <Text style={styles.metaLine}>
              Customer: {order.customerName || '—'} {order.customerEmail ? `(${order.customerEmail})` : ''}
            </Text>
            <Text style={styles.metaLine}>
              Status: <Text style={styles.bold}>{order.orderStatus.replace(/_/g, ' ')}</Text> · Payment:{' '}
              <Text style={styles.bold}>{order.paymentMethod} / {order.paymentStatus}</Text>
            </Text>
            <Text style={styles.metaLine}>Total: <Text style={styles.bold}>{CURRENCY} {order.total.toLocaleString()}</Text></Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Items</Text>
            {order.items.map((item) => (
              <View key={item.itemId} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.productName} {item.variantLabel ? `(${item.variantLabel})` : ''} ×{item.quantity}
                </Text>
                <Text style={styles.itemPrice}>{CURRENCY} {item.totalPrice.toLocaleString()}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Status History</Text>
            {(order.statusHistory || []).map((entry, index) => (
              <View key={index} style={styles.historyRow}>
                <View style={styles.historyDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyStatus}>{entry.status.replace(/_/g, ' ')}</Text>
                  <Text style={styles.historyMeta}>
                    {new Date(entry.changedAt).toLocaleString('en-PK')}
                    {entry.changedBy?.role ? ` · by ${entry.changedBy.role}` : ''}
                  </Text>
                  {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
                </View>
              </View>
            ))}
          </View>

          {order.group && order.group.orders.length > 1 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Sibling orders in this checkout</Text>
              {order.group.orders
                .filter((o) => o.orderId !== order.orderId)
                .map((o) => (
                  <TouchableOpacity
                    key={o.orderId}
                    style={styles.siblingRow}
                    onPress={() => dispatch(fetchAdminOrderDetail(o.orderId))}
                  >
                    <Text style={styles.siblingText}>
                      {o.odexId} · {o.orderStatus.replace(/_/g, ' ')} · {CURRENCY} {o.total.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.auditHeader}>
              <ShieldAlert size={16} stroke={COLORS.danger} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Admin actions (audited)</Text>
            </View>
            <Text style={styles.fieldLabel}>Reason (mandatory)</Text>
            <TextInput
              style={styles.input}
              placeholder="Why are you doing this?"
              placeholderTextColor={COLORS.textLight}
              value={reason}
              onChangeText={setReason}
            />
            <View style={styles.actionWrap}>
              {(NEXT_STATUSES[order.orderStatus] || []).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={styles.forceBtn}
                  disabled={acting}
                  onPress={() => handleForce(status)}
                >
                  <Text style={styles.forceText}>→ {status.replace(/_/g, ' ')}</Text>
                </TouchableOpacity>
              ))}
              {order.paymentStatus === 'paid' && (
                <TouchableOpacity style={styles.refundBtn} disabled={acting} onPress={handleRefund}>
                  <Banknote size={16} stroke="#FFF" strokeWidth={2} />
                  <Text style={styles.refundText}>{acting ? 'Working…' : 'Manual Refund'}</Text>
                </TouchableOpacity>
              )}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  center: { alignItems: 'center', padding: 24 },
  errorText: { color: COLORS.danger, marginTop: 8, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 8 },
  retryText: { color: '#FFF', fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  orderCode: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  metaLine: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  bold: { fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  itemName: { flex: 1, fontSize: 13, color: COLORS.text, marginRight: 8 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  historyRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 5 },
  historyStatus: { fontSize: 13, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
  historyMeta: { fontSize: 11, color: COLORS.textLight },
  historyNote: { fontSize: 12, color: COLORS.textLight, fontStyle: 'italic', marginTop: 2 },
  siblingRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  siblingText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  auditHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textLight, marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: COLORS.text },
  actionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  forceBtn: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  forceText: { color: COLORS.primary, fontWeight: '700', fontSize: 13, textTransform: 'capitalize' },
  refundBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.danger, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  refundText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});

export default AdminShoppingOrderDetailScreen;
