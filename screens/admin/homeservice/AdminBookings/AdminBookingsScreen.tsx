// ============================================
// Admin: all home-service bookings (HS8) — filters by status/category/
// customer search, paginated, consistent status chips.
// ============================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  fetchAdminBookings,
  AdminBookingRow,
} from '../../../../networks/serviceProviders/adminHomeServiceApi';

const COLORS = {
  primary: '#2A7FFF',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};

export const HS_STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  ACCEPTED: '#2A7FFF',
  EN_ROUTE: '#8B5CF6',
  ARRIVED: '#06B6D4',
  IN_PROGRESS: '#F97316',
  COMPLETED: '#27AE60',
  CANCELLED: '#E74C3C',
  REJECTED: '#E74C3C',
};

const STATUS_FILTERS = [
  'all',
  'PENDING',
  'ACCEPTED',
  'EN_ROUTE',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
];
const CATEGORY_FILTERS = ['all', 'electricians', 'plumbers', 'ac-repairers'];

const AdminBookingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [rows, setRows] = useState<AdminBookingRow[]>([]);
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminBookings({
      status,
      serviceCategory: category,
      search: search || undefined,
      page: 1,
      limit: 50,
    });
    if (res.success) setRows(res.data || []);
    else setError(res.message || 'Failed to load bookings');
    setLoading(false);
  }, [status, category, search]);

  useEffect(() => {
    load();
  }, [status, category]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderItem = ({ item }: { item: AdminBookingRow }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('AdminHSBookingDetail', { bookingId: item.id })}
    >
      <View style={styles.cardTop}>
        <Text style={styles.names} numberOfLines={1}>
          {item.customer?.name || 'Customer'} → {item.provider?.name || 'Provider'}
        </Text>
        <View
          style={[styles.chip, { backgroundColor: `${HS_STATUS_COLORS[item.status] || '#999'}20` }]}
        >
          <Text style={[styles.chipText, { color: HS_STATUS_COLORS[item.status] || '#999' }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {item.serviceType} · {item.city || '—'} · Rs. {item.price?.toLocaleString?.() || item.price}
      </Text>
      <Text style={styles.metaLight}>
        {item.scheduledFor ? new Date(item.scheduledFor).toLocaleString() : ''} · payment:{' '}
        {item.paymentStatus}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home Service Bookings</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customer name or email…"
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          returnKeyType="search"
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {STATUS_FILTERS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, status === s && styles.filterChipActive]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.filterText, status === s && styles.filterTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {CATEGORY_FILTERS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.filterChip, category === c && styles.filterChipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.filterText, category === c && styles.filterTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.stateText}>Loading bookings…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color="#ADB5BD" />
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="calendar-outline" size={44} color="#DEE2E6" />
              <Text style={styles.stateText}>No bookings match these filters.</Text>
            </View>
          }
        />
      )}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 9, marginLeft: 8, color: COLORS.text, fontSize: 14 },
  filterRow: { marginTop: 10, paddingHorizontal: 16 },
  filterChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  names: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 8 },
  chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 10, fontWeight: '700' },
  meta: { fontSize: 13, color: COLORS.text, marginTop: 6 },
  metaLight: { fontSize: 12, color: COLORS.textLight, marginTop: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { marginTop: 10, color: COLORS.textLight, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});

export default AdminBookingsScreen;
