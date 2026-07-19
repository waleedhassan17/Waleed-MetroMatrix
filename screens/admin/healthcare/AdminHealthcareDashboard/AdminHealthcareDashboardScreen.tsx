import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchAdminHealthcareDashboardApi } from '../../../../networks/healthcare/adminApi';

const COLORS = {
  primary: '#2A7FFF',
  primaryLight: '#EAF3FF',
  success: '#27AE60',
  danger: '#E74C3C',
  warn: '#F59E0B',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};

type DashboardData = {
  pendingDoctorApprovals: number;
  appointmentsToday: number;
  revenueToday: number;
  cancellationRate: number;
  openRefundCandidates: number;
  topSpecialties: { name: string; count: number }[];
};

const AdminHealthcareDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminHealthcareDashboardApi();
    if (res.success) setData(res.data);
    else setError(res.message || 'Failed to load dashboard');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tiles = [
    { label: 'Pending doctor approvals', value: data?.pendingDoctorApprovals ?? 0, icon: 'medkit-outline', color: COLORS.warn, route: 'DoctorManagement' },
    { label: 'Appointments today', value: data?.appointmentsToday ?? 0, icon: 'calendar-outline', color: COLORS.primary, route: 'AdminAppointments' },
    { label: 'Revenue today', value: `PKR ${(data?.revenueToday ?? 0).toLocaleString()}`, icon: 'cash-outline', color: COLORS.success, route: 'HealthcareAnalytics' },
    { label: 'Cancellation rate', value: `${data?.cancellationRate ?? 0}%`, icon: 'close-circle-outline', color: COLORS.danger, route: 'AdminAppointments' },
    { label: 'Paid + cancelled (refund check)', value: data?.openRefundCandidates ?? 0, icon: 'arrow-undo-outline', color: COLORS.warn, route: 'AdminAppointments' },
  ];

  const links = [
    { label: 'Doctor Management', route: 'DoctorManagement', icon: 'medkit-outline' },
    { label: 'All Appointments', route: 'AdminAppointments', icon: 'calendar-outline' },
    { label: 'Clinics', route: 'AdminClinicManagement', icon: 'business-outline' },
    { label: 'Review Moderation', route: 'AdminReviewModeration', icon: 'star-half-outline' },
    { label: 'Specialties', route: 'SpecialtyManagement', icon: 'grid-outline' },
    { label: 'Analytics', route: 'HealthcareAnalytics', icon: 'bar-chart-outline' },
    { label: 'Healthcare Settings', route: 'AdminHealthcareSettings', icon: 'settings-outline' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Healthcare Overview</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={load} />}
      >
        {loading && !data && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 32 }} />}
        {error && !data && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.tileGrid}>
          {tiles.map((tile) => (
            <TouchableOpacity
              key={tile.label}
              style={styles.tile}
              onPress={() => navigation.navigate(tile.route as never)}
            >
              <Ionicons name={tile.icon as any} size={20} color={tile.color} />
              <Text style={styles.tileValue}>{tile.value}</Text>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {data?.topSpecialties && data.topSpecialties.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Top specialties by demand</Text>
            {data.topSpecialties.map((s, i) => (
              <View key={i} style={styles.specRow}>
                <Text style={styles.specName}>{s.name || 'Unassigned'}</Text>
                <Text style={styles.specCount}>{s.count} appts</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Manage</Text>
        {links.map((link) => (
          <TouchableOpacity
            key={link.label}
            style={styles.linkRow}
            onPress={() => navigation.navigate(link.route as never)}
          >
            <View style={styles.linkIcon}>
              <Ionicons name={link.icon as any} size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.linkLabel}>{link.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll: { padding: 16, paddingBottom: 40 },
  center: { alignItems: 'center', paddingVertical: 24 },
  errorText: { color: COLORS.textLight, marginBottom: 12, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '47%', backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  tileValue: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 8 },
  tileLabel: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 20, marginBottom: 10 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  specName: { fontSize: 13, color: COLORS.text },
  specCount: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  linkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  linkIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  linkLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
});

export default AdminHealthcareDashboardScreen;
