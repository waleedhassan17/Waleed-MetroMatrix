// ============================================
// Admin: home-services analytics (HS8) — bookings over time and by category,
// revenue/commission, average completion time, cancellation rate, top
// providers. Same hand-rolled bar-chart approach the healthcare admin
// analytics screen already uses — no new charting library.
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchAdminHSAnalytics } from '../../../../networks/serviceProviders/adminHomeServiceApi';

const COLORS = {
  primary: '#2A7FFF',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
  success: '#27AE60',
  warning: '#F59E0B',
};

const formatMoney = (v: number) => `Rs. ${Math.round(v).toLocaleString()}`;

const SimpleBarChart: React.FC<{
  data: { label: string; value: number; color?: string }[];
  formatValue?: (v: number) => string;
}> = ({ data, formatValue = (v) => String(v) }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View>
      {data.map((item, i) => (
        <View key={i} style={styles.barRow}>
          <Text style={styles.barLabel} numberOfLines={1}>
            {item.label}
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${(item.value / max) * 100}%`,
                  backgroundColor: item.color || COLORS.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.barValue}>{formatValue(item.value)}</Text>
        </View>
      ))}
    </View>
  );
};

const AdminHomeServiceAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminHSAnalytics({});
    if (res.success) setData(res.data);
    else setError(res.message || 'Failed to load analytics');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home Services Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error || !data ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>{error || 'No data'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={styles.statsGrid}>
            <StatTile label="Revenue" value={formatMoney(data.revenue)} color={COLORS.success} />
            <StatTile label="Commission" value={formatMoney(data.commission)} color={COLORS.primary} />
            <StatTile
              label="Avg completion"
              value={`${data.averageCompletionMinutes} min`}
              color={COLORS.warning}
            />
            <StatTile
              label="Cancellation rate"
              value={`${data.cancellationRate}%`}
              color="#E74C3C"
            />
          </View>

          <Text style={styles.sectionTitle}>Bookings over time</Text>
          <View style={styles.card}>
            <SimpleBarChart
              data={(data.bookingsOverTime || []).slice(-14).map((x: any) => ({
                label: x.date.slice(5),
                value: x.count,
              }))}
            />
          </View>

          <Text style={styles.sectionTitle}>By category</Text>
          <View style={styles.card}>
            <SimpleBarChart
              data={(data.byCategory || []).map((x: any) => ({
                label: x.category,
                value: x.count,
              }))}
            />
          </View>

          <Text style={styles.sectionTitle}>By status</Text>
          <View style={styles.card}>
            <SimpleBarChart
              data={(data.byStatus || []).map((x: any) => ({
                label: x.status,
                value: x.count,
              }))}
            />
          </View>

          <Text style={styles.sectionTitle}>Top providers (by jobs)</Text>
          <View style={styles.card}>
            {(data.topProviders || []).map((p: any) => (
              <View key={p.id} style={styles.providerRow}>
                <Text style={styles.providerName}>{p.name}</Text>
                <Text style={styles.providerMeta}>
                  {p.jobs} jobs · ★ {p.rating?.toFixed?.(1) ?? p.rating} · {formatMoney(p.gross)}
                </Text>
              </View>
            ))}
            {!data.topProviders?.length && (
              <Text style={styles.stateText}>No completed jobs in this range yet.</Text>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

function StatTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statTile, { borderColor: `${color}40` }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  statTile: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginRight: '4%',
    marginBottom: 12,
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 8, marginTop: 6 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { width: 70, fontSize: 11, color: COLORS.textLight },
  barTrack: { flex: 1, height: 10, backgroundColor: '#F1F3F5', borderRadius: 5, marginHorizontal: 8 },
  barFill: { height: 10, borderRadius: 5 },
  barValue: { width: 50, fontSize: 11, color: COLORS.text, textAlign: 'right' },
  providerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  providerName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  providerMeta: { fontSize: 12, color: COLORS.textLight },
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

export default AdminHomeServiceAnalyticsScreen;
