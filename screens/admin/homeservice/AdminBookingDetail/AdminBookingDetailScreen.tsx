// ============================================
// Admin: booking detail (HS8) — full statusHistory timeline, payment trail,
// dispute link, and the audited admin actions: force status change (reason
// mandatory) and manual refund, both behind confirmation dialogs.
// ============================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  fetchAdminBookingDetail,
  forceBookingStatus,
  refundBooking,
} from '../../../../networks/serviceProviders/adminHomeServiceApi';
import { HS_STATUS_COLORS } from '../AdminBookings/AdminBookingsScreen';

const COLORS = {
  primary: '#2A7FFF',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
  danger: '#E74C3C',
};

const FORCE_TARGETS = ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

type Params = { bookingId: string };

const AdminBookingDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const { bookingId } = route.params || ({} as Params);

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [forceOpen, setForceOpen] = useState(false);
  const [forceTarget, setForceTarget] = useState<string | null>(null);
  const [forceReason, setForceReason] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminBookingDetail(bookingId);
    if (res.success) setData(res.data);
    else setError(res.message || 'Failed to load booking');
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const doForce = async () => {
    if (!forceTarget || !forceReason.trim()) {
      Alert.alert('Reason required', 'A force-transition must include a reason — it is audited.');
      return;
    }
    setActing(true);
    const res = await forceBookingStatus(bookingId, forceTarget, forceReason.trim());
    setActing(false);
    if (res.success) {
      setForceOpen(false);
      setForceReason('');
      setForceTarget(null);
      load();
    } else {
      Alert.alert('Error', res.message || 'Force transition failed');
    }
  };

  const doRefund = async () => {
    if (!refundReason.trim()) {
      Alert.alert('Reason required', 'A refund must include a reason — it is audited.');
      return;
    }
    setActing(true);
    const res = await refundBooking(
      bookingId,
      refundAmount ? Number(refundAmount) : undefined,
      refundReason.trim()
    );
    setActing(false);
    if (res.success) {
      setRefundOpen(false);
      setRefundAmount('');
      setRefundReason('');
      Alert.alert('Refunded', `Rs. ${res.data.amount} credited to the customer's wallet.`);
      load();
    } else {
      Alert.alert('Error', res.message || 'Refund failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Detail</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error || !data ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>{error || 'Not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.big}>{data.serviceType}</Text>
              <View
                style={[styles.chip, { backgroundColor: `${HS_STATUS_COLORS[data.status] || '#999'}20` }]}
              >
                <Text style={[styles.chipText, { color: HS_STATUS_COLORS[data.status] || '#999' }]}>
                  {data.status}
                </Text>
              </View>
            </View>
            <Text style={styles.meta}>Customer: {data.customer?.name} ({data.customer?.email})</Text>
            <Text style={styles.meta}>Provider: {data.provider?.name} ({data.provider?.email})</Text>
            <Text style={styles.meta}>
              Scheduled: {data.scheduledFor ? new Date(data.scheduledFor).toLocaleString() : '—'}
            </Text>
            <Text style={styles.meta}>Price: Rs. {data.price}</Text>
            {data.dispute && (
              <TouchableOpacity onPress={() => navigation.navigate('AdminHSDisputes')}>
                <Text style={[styles.meta, { color: COLORS.danger, fontWeight: '700' }]}>
                  ⚠ Dispute {data.dispute.status}: {data.dispute.reason}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.sectionTitle}>Status history</Text>
          <View style={styles.card}>
            {(data.statusHistory || []).map((h: any, i: number) => (
              <View key={i} style={styles.historyRow}>
                <View
                  style={[styles.dot, { backgroundColor: HS_STATUS_COLORS[h.status] || '#999' }]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyStatus}>
                    {h.status} <Text style={styles.historyRole}>({h.role})</Text>
                  </Text>
                  <Text style={styles.historyMeta}>
                    {h.changedAt ? new Date(h.changedAt).toLocaleString() : ''}
                  </Text>
                  {!!h.note && <Text style={styles.historyNote}>{h.note}</Text>}
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Payment trail</Text>
          <View style={styles.card}>
            <Text style={styles.meta}>Status: {data.payment?.status}</Text>
            <Text style={styles.meta}>Method: {data.payment?.method || '—'}</Text>
            <Text style={styles.meta}>
              Paid at: {data.payment?.paidAt ? new Date(data.payment.paidAt).toLocaleString() : '—'}
            </Text>
            {data.payment?.transaction && (
              <Text style={styles.meta}>
                Wallet txn: {data.payment.transaction._id || data.payment.transaction}
              </Text>
            )}
            {data.review && (
              <Text style={styles.meta}>
                Review: ★ {data.review.rating} — {data.review.comment || 'no comment'}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setForceOpen(true)}>
              <Ionicons name="swap-horizontal" size={18} color="#fff" />
              <Text style={styles.actionText}>Force status</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.danger }]}
              onPress={() => setRefundOpen(true)}
            >
              <Ionicons name="cash-outline" size={18} color="#fff" />
              <Text style={styles.actionText}>Refund</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Force status modal */}
      <Modal visible={forceOpen} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Force status change</Text>
            <Text style={styles.auditNote}>
              This action is audited with your admin id and the reason below.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
              {FORCE_TARGETS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.targetChip, forceTarget === s && styles.targetChipActive]}
                  onPress={() => setForceTarget(s)}
                >
                  <Text
                    style={[styles.targetText, forceTarget === s && styles.targetTextActive]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Mandatory reason…"
              placeholderTextColor={COLORS.textLight}
              value={forceReason}
              onChangeText={setForceReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setForceOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={doForce} disabled={acting}>
                {acting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>Apply</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Refund modal */}
      <Modal visible={refundOpen} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Manual wallet refund</Text>
            <Text style={styles.auditNote}>
              Credits the customer's wallet. Audited with your admin id.
            </Text>
            <TextInput
              style={styles.input}
              placeholder={`Amount (blank = full Rs. ${data?.price ?? ''})`}
              placeholderTextColor={COLORS.textLight}
              value={refundAmount}
              onChangeText={setRefundAmount}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Mandatory reason…"
              placeholderTextColor={COLORS.textLight}
              value={refundReason}
              onChangeText={setRefundReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRefundOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: COLORS.danger }]}
                onPress={doRefund}
                disabled={acting}
              >
                {acting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>Refund</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  big: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 10, fontWeight: '700' },
  meta: { fontSize: 13, color: COLORS.text, marginTop: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, marginRight: 10 },
  historyStatus: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  historyRole: { fontWeight: '400', color: COLORS.textLight },
  historyMeta: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
  historyNote: { fontSize: 12, color: COLORS.textLight, fontStyle: 'italic', marginTop: 2 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginRight: 10,
  },
  actionText: { color: '#fff', fontWeight: '700', marginLeft: 6, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { color: COLORS.textLight, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  auditNote: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  targetChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  targetChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  targetText: { fontSize: 11, fontWeight: '700', color: COLORS.textLight },
  targetTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  modalActions: { flexDirection: 'row', marginTop: 14 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelText: { color: COLORS.text, fontWeight: '700' },
  confirmBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '700' },
});

export default AdminBookingDetailScreen;
