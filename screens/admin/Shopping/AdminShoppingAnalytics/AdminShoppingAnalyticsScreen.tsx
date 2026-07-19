import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, TrendingUp } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  fetchAdminShoppingAnalytics,
  selectAdminShoppingAnalytics,
  setAnalyticsRange,
  type AnalyticsRange,
} from './adminShoppingAnalyticsSlice';

const COLORS = {
  primary: '#E67E22',
  primaryLight: '#FFF3E6',
  success: '#27AE60',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6C757D',
  border: '#E9ECEF',
};
const CURRENCY = 'PKR';
const RANGES: { key: AnalyticsRange; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
];

// Simple horizontal bar — same approach as the vendor analytics screen,
// no charting library.
const Bar: React.FC<{ label: string; value: number; max: number; suffix?: string }> = ({ label, value, max, suffix }) => (
  <View style={styles.barRow}>
    <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${max > 0 ? Math.max(4, (value / max) * 100) : 0}%` }]} />
    </View>
    <Text style={styles.barValue}>{suffix ? `${value.toLocaleString()}${suffix}` : value.toLocaleString()}</Text>
  </View>
);

const AdminShoppingAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { range, data, loading, error } = useAppSelector(selectAdminShoppingAnalytics);

  useEffect(() => {
    dispatch(fetchAdminShoppingAnalytics(range));
  }, [dispatch, range]);

  const maxGmv = Math.max(1, ...(data?.gmvSeries.map((p) => p.gmv) || [1]));
  const maxBrand = Math.max(1, ...(data?.revenueByBrand.map((b) => b.revenue) || [1]));
  const maxProduct = Math.max(1, ...(data?.topProducts.map((p) => p.revenue) || [1]));
  const statusEntries = Object.entries(data?.ordersByStatus || {});
  const maxStatus = Math.max(1, ...statusEntries.map(([, count]) => count));

  const stats = [
    { label: 'GMV', value: `${CURRENCY} ${(data?.gmv ?? 0).toLocaleString()}` },
    { label: 'Commission earned', value: `${CURRENCY} ${(data?.commission ?? 0).toLocaleString()}` },
    { label: 'Orders', value: String(data?.totalOrders ?? 0) },
    { label: 'Avg order value', value: `${CURRENCY} ${(data?.avgOrderValue ?? 0).toLocaleString()}` },
    { label: 'New customers', value: String(data?.newCustomers ?? 0) },
    { label: 'Active brands', value: String(data?.activeBrands ?? 0) },
    { label: 'Return rate', value: `${data?.returnRate ?? 0}%` },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} stroke={COLORS.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Platform Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.rangeChip, range === r.key && styles.rangeChipOn]}
              onPress={() => dispatch(setAnalyticsRange(r.key))}
            >
              <Text style={[styles.rangeText, range === r.key && styles.rangeTextOn]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && !data && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 32 }} />}
        {error && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchAdminShoppingAnalytics(range))}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {data && (
          <>
            <View style={styles.statGrid}>
              {stats.map((stat) => (
                <View key={stat.label} style={styles.statTile}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <TrendingUp size={16} stroke={COLORS.primary} strokeWidth={2} />
                <Text style={styles.sectionTitle}>GMV over time</Text>
              </View>
              {data.gmvSeries.length === 0 ? (
                <Text style={styles.emptyText}>No delivered orders in this period</Text>
              ) : (
                data.gmvSeries.map((point) => (
                  <Bar key={point.label} label={point.label.slice(5)} value={point.gmv} max={maxGmv} />
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Revenue by brand (top 10)</Text>
              {data.revenueByBrand.length === 0 ? (
                <Text style={styles.emptyText}>No revenue yet</Text>
              ) : (
                data.revenueByBrand.map((brand) => (
                  <Bar key={brand.brandId} label={brand.brandName} value={brand.revenue} max={maxBrand} />
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Orders by status</Text>
              {statusEntries.length === 0 ? (
                <Text style={styles.emptyText}>No orders in this period</Text>
              ) : (
                statusEntries.map(([status, count]) => (
                  <Bar key={status} label={status.replace(/_/g, ' ')} value={count} max={maxStatus} />
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Top products platform-wide</Text>
              {data.topProducts.length === 0 ? (
                <Text style={styles.emptyText}>No sales yet</Text>
              ) : (
                data.topProducts.map((product) => (
                  <Bar key={product.productId} label={product.name} value={product.revenue} max={maxProduct} />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll: { padding: 16, paddingBottom: 40 },
  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  rangeChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: COLORS.card },
  rangeChipOn: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  rangeText: { fontSize: 13, fontWeight: '600', color: COLORS.textLight },
  rangeTextOn: { color: COLORS.primary },
  center: { alignItems: 'center', paddingVertical: 24 },
  errorText: { color: COLORS.textLight, marginBottom: 12, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#FFF', fontWeight: '700' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statTile: { width: '47%', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyText: { fontSize: 13, color: COLORS.textLight },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  barLabel: { width: 90, fontSize: 11, color: COLORS.textLight, textTransform: 'capitalize' },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: COLORS.border, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  barValue: { width: 78, fontSize: 11, fontWeight: '700', color: COLORS.text, textAlign: 'right' },
});

export default AdminShoppingAnalyticsScreen;
