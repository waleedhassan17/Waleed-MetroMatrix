// ============================================
// Booking detail (HS8) — status timeline from statusHistory, price/payment
// breakdown, and the contextual actions (cancel / chat / track / pay /
// review / raise dispute). The bookings tab finally has somewhere to go.
// ============================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchBookingDetail } from '../../../../networks/serviceProviders/adminHomeServiceApi';
import { cancelBooking } from '../../../../networks/serviceProviders/bookingNetwork';

type Params = { bookingId: string };

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  ACCEPTED: '#3B82F6',
  EN_ROUTE: '#8B5CF6',
  ARRIVED: '#06B6D4',
  IN_PROGRESS: '#F97316',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
  REJECTED: '#EF4444',
};

const CANCELLABLE = ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'];
const TRACKABLE = ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];

export default function BookingDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const { bookingId } = route.params || ({} as Params);

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchBookingDetail(bookingId);
    if (res.success) setData(res.data);
    else setError(res.message || 'Failed to load booking');
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const doCancel = () => {
    Alert.alert('Cancel booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          const res = await cancelBooking(bookingId, 'Cancelled from booking detail');
          if (res.success) load();
          else Alert.alert('Error', res.message || 'Could not cancel');
        },
      },
    ]);
  };

  const status = data?.canonicalStatus as string | undefined;
  const paid = data?.payment?.status === 'paid';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Detail</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.stateText}>Loading booking…</Text>
        </View>
      ) : error || !data ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color="#9CA3AF" />
          <Text style={styles.stateText}>{error || 'Booking not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Provider card */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={{ uri: data.provider?.image }} style={styles.avatar} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.providerName}>{data.provider?.name}</Text>
                <Text style={styles.providerSub}>
                  {data.bookingDetails?.service} · ★ {data.provider?.rating}
                </Text>
              </View>
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: `${STATUS_COLORS[status || 'PENDING']}20` },
                ]}
              >
                <Text
                  style={[styles.statusChipText, { color: STATUS_COLORS[status || 'PENDING'] }]}
                >
                  {status}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <Row icon="calendar-outline" text={`${data.bookingDetails?.selectedDate} · ${data.bookingDetails?.selectedTime}`} />
            <Row icon="location-outline" text={data.bookingDetails?.selectedAddress?.address || '—'} />
            {!!data.bookingDetails?.instructions && (
              <Row icon="document-text-outline" text={data.bookingDetails.instructions} />
            )}
          </View>

          {/* Status timeline */}
          <Text style={styles.sectionTitle}>Status timeline</Text>
          <View style={styles.card}>
            {(data.statusHistory || []).map((h: any, i: number) => (
              <View key={`${h.status}-${i}`} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[styles.timelineDot, { backgroundColor: STATUS_COLORS[h.status] || '#9CA3AF' }]}
                  />
                  {i < data.statusHistory.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 14 }}>
                  <Text style={styles.timelineStatus}>{h.status}</Text>
                  <Text style={styles.timelineMeta}>
                    {h.changedAt ? new Date(h.changedAt).toLocaleString() : ''} · {h.role}
                  </Text>
                  {!!h.note && <Text style={styles.timelineNote}>{h.note}</Text>}
                </View>
              </View>
            ))}
          </View>

          {/* Payment */}
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.card}>
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>Amount</Text>
              <Text style={styles.payValue}>Rs. {data.payment?.amount?.toLocaleString?.() || data.payment?.amount}</Text>
            </View>
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>Status</Text>
              <Text style={[styles.payValue, { color: paid ? '#10B981' : '#F59E0B' }]}>
                {data.payment?.status}
              </Text>
            </View>
            {!!data.payment?.method && (
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Method</Text>
                <Text style={styles.payValue}>{data.payment.method}</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {TRACKABLE.includes(status || '') && (
              <ActionBtn
                icon="navigate"
                label="Track"
                color="#8B5CF6"
                onPress={() => navigation.navigate('liveTracking', { bookingId })}
              />
            )}
            {status && !['PENDING', 'REJECTED', 'CANCELLED'].includes(status) && (
              <ActionBtn
                icon="chatbubbles"
                label="Chat"
                color="#3B82F6"
                onPress={() =>
                  navigation.navigate('ProviderChatScreen', {
                    bookingId,
                    provider: data.provider,
                  })
                }
              />
            )}
            {status === 'COMPLETED' && !paid && (
              <ActionBtn
                icon="wallet"
                label="Pay"
                color="#10B981"
                onPress={() => navigation.navigate('PaymentScreen', { bookingId })}
              />
            )}
            {status === 'COMPLETED' && paid && !data.review && (
              <ActionBtn
                icon="star"
                label="Review"
                color="#F59E0B"
                onPress={() => navigation.navigate('ReviewRating', { bookingId })}
              />
            )}
            {CANCELLABLE.includes(status || '') && (
              <ActionBtn icon="close-circle" label="Cancel" color="#EF4444" onPress={doCancel} />
            )}
            {status === 'COMPLETED' && (
              <ActionBtn
                icon="alert-circle"
                label="Dispute"
                color="#F97316"
                onPress={() => navigation.navigate('RaiseDispute', { bookingId })}
              />
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color="#6B7280" />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  color,
  onPress,
}: {
  icon: any;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${color}15` }]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 14 : 14,
  },
  headerBtn: { width: 36, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 14,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E7EB' },
  providerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  providerSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  infoText: { color: '#374151', fontSize: 13, marginLeft: 8, flex: 1, lineHeight: 18 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8 },
  timelineRow: { flexDirection: 'row' },
  timelineLeft: { alignItems: 'center', width: 24 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginTop: 2 },
  timelineStatus: { fontSize: 13, fontWeight: '700', color: '#111827' },
  timelineMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  timelineNote: { fontSize: 12, color: '#6B7280', marginTop: 2, fontStyle: 'italic' },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  payLabel: { color: '#6B7280', fontSize: 13 },
  payValue: { color: '#111827', fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  actionLabel: { fontWeight: '700', fontSize: 13, marginLeft: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { marginTop: 10, color: '#6B7280', fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 14,
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
