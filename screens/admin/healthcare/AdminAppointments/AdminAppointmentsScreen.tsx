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
import { fetchAdminAppointmentsApi } from '../../../../networks/healthcare/adminApi';

const COLORS = {
  primary: '#2A7FFF',
  primaryLight: '#EAF3FF',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#2A7FFF',
  completed: '#27AE60',
  cancelled: '#E74C3C',
};

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];
const TYPE_FILTERS = ['all', 'in-clinic', 'video'];

const AdminAppointmentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [patient, setPatient] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminAppointmentsApi({
      page: 1,
      limit: 50,
      status: status !== 'all' ? status : undefined,
      type: type !== 'all' ? type : undefined,
      patient: patient || undefined,
    });
    if (res.success) setRows(res.data);
    else setError(res.message || 'Failed to load appointments');
    setLoading(false);
  }, [status, type, patient]);

  useEffect(() => {
    load();
  }, [status, type]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderItem = ({ item }: { item: any }) => {
    const id = String(item.id || item._id);
    const doctorName = item.doctorId?.providerId?.fullName || 'Doctor';
    const patientName = item.patientId?.fullName || item.patientInfo?.name || 'Patient';
    const slot = item.slotId;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AdminAppointmentDetail', { appointmentId: id })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.names} numberOfLines={1}>
            {patientName} → Dr. {doctorName}
          </Text>
          <View style={[styles.chip, { backgroundColor: `${STATUS_COLORS[item.status] || '#999'}20` }]}>
            <Text style={[styles.chipText, { color: STATUS_COLORS[item.status] || '#999' }]}>
              {item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {item.type}{slot?.date ? ` · ${new Date(slot.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}` : ''}
          {slot?.startTime ? ` ${slot.startTime}` : ''}
          {' · '}PKR {(item.totalAmount || 0).toLocaleString()}
          {item.payment?.status ? ` (${item.payment.status})` : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>All Appointments</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patient name or email…"
          placeholderTextColor={COLORS.textLight}
          value={patient}
          onChangeText={setPatient}
          onSubmitEditing={load}
          returnKeyType="search"
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity key={f} style={[styles.filterChip, status === f && styles.filterChipOn]} onPress={() => setStatus(f)}>
              <Text style={[styles.filterText, status === f && styles.filterTextOn]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {TYPE_FILTERS.map((f) => (
            <TouchableOpacity key={f} style={[styles.filterChip, type === f && styles.filterChipOn]} onPress={() => setType(f)}>
              <Text style={[styles.filterText, type === f && styles.filterTextOn]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id || item._id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.center}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.textLight} />
              <Text style={styles.emptyText}>{error || 'No appointments match these filters'}</Text>
              {error && (
                <TouchableOpacity style={styles.retryBtn} onPress={load}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card, marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  filterRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  filterChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.card },
  filterChipOn: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textLight, textTransform: 'capitalize' },
  filterTextOn: { color: COLORS.primary },
  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  names: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text, marginRight: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  meta: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  center: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.textLight, marginTop: 10, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
});

export default AdminAppointmentsScreen;
