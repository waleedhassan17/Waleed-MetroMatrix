import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  DollarSign,
  Minus,
  Package,
  PieChart,
  RotateCcw,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  selectBrandAnalytics,
  fetchBrandAnalytics,
  setPeriod,
  type AnalyticsPeriod,
} from './brandAnalyticsSlice';

const STATUS_BAR_H = Platform.OS === 'android' ? StatusBar.currentHeight || 44 : 44;

const B = {
  primary: '#E67E22',
  primaryDark: '#D35400',
  primaryLight: '#FFF5EB',
  surface: '#FFFFFF',
  bg: '#F8F9FA',
  text: '#1A1A2E',
  textSec: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#F0F0F0',
  success: '#10B981',
  successLight: '#ECFDF5',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  info: '#3B82F6',
  infoLight: '#EFF6FF',
  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',
  amber: '#F59E0B',
  amberLight: '#FFFBEB',
};

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'all', label: 'All Time' },
];

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000) return `₨${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₨${(amount / 1_000).toFixed(0)}K`;
  return `₨${amount.toLocaleString()}`;
};

const BrandAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const {
    period,
    summary,
    revenueChart,
    topProducts,
    categoryBreakdown,
    previousPeriodRevenue,
  } = useAppSelector(selectBrandAnalytics);

  useEffect(() => {
    dispatch(fetchBrandAnalytics(period));
  }, [dispatch, period]);

  const revenueTrend = previousPeriodRevenue > 0
    ? ((summary.totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
    : 0;
  const trendPositive = revenueTrend >= 0;
  const maxChartValue = Math.max(...revenueChart.map((p) => p.revenue), 1);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={B.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} stroke={B.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Period Filter ── */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodChip, period === p.key && styles.periodChipActive]}
              onPress={() => dispatch(setPeriod(p.key))}
            >
              <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Financial Summary Cards ── */}
        <View style={styles.finGrid}>
          <View style={[styles.finCard, styles.finCardWide]}>
            <View style={[styles.finIcon, { backgroundColor: B.primaryLight }]}>
              <TrendingUp size={18} stroke={B.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.finLabel}>Total Revenue</Text>
              <Text style={styles.finValueLg}>{formatCurrency(summary.totalRevenue)}</Text>
            </View>
            <View style={[styles.trendBadge, { backgroundColor: trendPositive ? B.successLight : B.errorLight }]}>
              {trendPositive ? (
                <ArrowUpRight size={12} stroke={B.success} strokeWidth={2} />
              ) : (
                <ArrowDownRight size={12} stroke={B.error} strokeWidth={2} />
              )}
              <Text style={[styles.trendText, { color: trendPositive ? B.success : B.error }]}>
                {Math.abs(revenueTrend).toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={styles.finCard}>
            <View style={[styles.finIcon, { backgroundColor: B.successLight }]}>
              <Wallet size={16} stroke={B.success} strokeWidth={2} />
            </View>
            <Text style={styles.finLabel}>Income</Text>
            <Text style={styles.finValue}>{formatCurrency(summary.totalIncome)}</Text>
            <Text style={styles.finSub}>After 12% fee</Text>
          </View>

          <View style={styles.finCard}>
            <View style={[styles.finIcon, { backgroundColor: B.purpleLight }]}>
              <DollarSign size={16} stroke={B.purple} strokeWidth={2} />
            </View>
            <Text style={styles.finLabel}>Net Profit</Text>
            <Text style={[styles.finValue, summary.netProfit < 0 && { color: B.error }]}>
              {formatCurrency(summary.netProfit)}
            </Text>
            <Text style={styles.finSub}>
              {summary.totalRevenue > 0
                ? `${((summary.netProfit / summary.totalRevenue) * 100).toFixed(1)}% margin`
                : '-'}
            </Text>
          </View>

          <View style={styles.finCard}>
            <View style={[styles.finIcon, { backgroundColor: B.errorLight }]}>
              <Minus size={16} stroke={B.error} strokeWidth={2} />
            </View>
            <Text style={styles.finLabel}>Expenses</Text>
            <Text style={styles.finValue}>{formatCurrency(summary.totalExpenses)}</Text>
            <Text style={styles.finSub}>Ship + Refunds + Ads</Text>
          </View>

          <View style={styles.finCard}>
            <View style={[styles.finIcon, { backgroundColor: B.infoLight }]}>
              <Package size={16} stroke={B.info} strokeWidth={2} />
            </View>
            <Text style={styles.finLabel}>Orders</Text>
            <Text style={styles.finValue}>{summary.totalOrders}</Text>
            <Text style={styles.finSub}>Avg ₨{summary.avgOrderValue.toLocaleString()}</Text>
          </View>

          <View style={styles.finCard}>
            <View style={[styles.finIcon, { backgroundColor: B.amberLight }]}>
              <RotateCcw size={16} stroke={B.amber} strokeWidth={2} />
            </View>
            <Text style={styles.finLabel}>Returns</Text>
            <Text style={styles.finValue}>{summary.returnsCount}</Text>
            <Text style={styles.finSub}>{formatCurrency(summary.refundsAmount)} refunded</Text>
          </View>
        </View>

        {/* ── Revenue Chart ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BarChart3 size={16} stroke={B.primary} strokeWidth={2} />
            <Text style={styles.cardTitle}>Revenue Trend</Text>
          </View>
          <View style={styles.chartContainer}>
            {revenueChart.map((point, idx) => {
              const barH = Math.max(8, (point.revenue / maxChartValue) * 130);
              const isMax = point.revenue === maxChartValue;
              return (
                <View key={`${idx}`} style={styles.chartCol}>
                  <Text style={styles.chartValue}>{formatCurrency(point.revenue)}</Text>
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: barH,
                        backgroundColor: isMax ? B.primary : `${B.primary}40`,
                      },
                    ]}
                  />
                  <Text style={[styles.chartLabel, isMax && { color: B.primary, fontWeight: '700' }]}>
                    {point.label}
                  </Text>
                  <Text style={styles.chartOrders}>{point.orders} orders</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Category Breakdown ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <PieChart size={16} stroke={B.primary} strokeWidth={2} />
            <Text style={styles.cardTitle}>Revenue by Category</Text>
          </View>
          {/* Mini donut representation */}
          <View style={styles.catBarRow}>
            {categoryBreakdown.map((cat) => (
              <View
                key={cat.category}
                style={[styles.catBarSegment, { flex: cat.percentage, backgroundColor: cat.color }]}
              />
            ))}
          </View>
          {categoryBreakdown.map((cat, idx) => (
            <View
              key={cat.category}
              style={[styles.catRow, idx < categoryBreakdown.length - 1 && styles.catRowBorder]}
            >
              <View style={styles.catLeft}>
                <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                <Text style={styles.catName}>{cat.category}</Text>
              </View>
              <View style={styles.catRight}>
                <Text style={styles.catRevenue}>{formatCurrency(cat.revenue)}</Text>
                <Text style={styles.catPct}>{cat.percentage}%</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Top Products ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUp size={16} stroke={B.primary} strokeWidth={2} />
            <Text style={styles.cardTitle}>Top Selling Products</Text>
          </View>
          {topProducts.map((product, idx) => (
            <View
              key={product.productId}
              style={[styles.prodRow, idx < topProducts.length - 1 && styles.catRowBorder]}
            >
              <View style={styles.prodRank}>
                <Text style={styles.prodRankText}>#{idx + 1}</Text>
              </View>
              <View style={styles.prodInfo}>
                <Text style={styles.prodName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.prodMeta}>
                  {product.unitsSold} units · {product.productId}
                </Text>
              </View>
              <Text style={styles.prodRevenue}>{formatCurrency(product.revenue)}</Text>
            </View>
          ))}
        </View>

        {/* ── Conversion Metrics ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BarChart3 size={16} stroke={B.primary} strokeWidth={2} />
            <Text style={styles.cardTitle}>Conversion & Performance</Text>
          </View>
          <View style={styles.metricGrid}>
            {[
              { label: 'Conversion Rate', value: `${summary.conversionRate}%`, color: B.success },
              { label: 'Avg Order Value', value: `₨${summary.avgOrderValue.toLocaleString()}`, color: B.info },
              { label: 'Return Rate', value: summary.totalOrders > 0 ? `${((summary.returnsCount / summary.totalOrders) * 100).toFixed(1)}%` : '0%', color: B.amber },
              { label: 'Profit Margin', value: summary.totalRevenue > 0 ? `${((summary.netProfit / summary.totalRevenue) * 100).toFixed(1)}%` : '-', color: B.purple },
            ].map((m) => (
              <View key={m.label} style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
                <Text style={styles.metricLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: B.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: STATUS_BAR_H + 12,
    paddingBottom: 12,
    backgroundColor: B.surface,
    borderBottomWidth: 1,
    borderBottomColor: B.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: B.text },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Period Filter
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: B.surface,
    borderWidth: 1,
    borderColor: B.border,
  },
  periodChipActive: { backgroundColor: B.primary, borderColor: B.primary },
  periodText: { fontSize: 12, fontWeight: '700', color: B.textSec },
  periodTextActive: { color: '#FFF' },

  // Financial Grid
  finGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  finCard: {
    width: '47.5%' as any,
    padding: 14,
    borderRadius: 14,
    backgroundColor: B.surface,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  finCardWide: { width: '100%' as any, flexDirection: 'row', alignItems: 'center', gap: 12 },
  finIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  finLabel: { fontSize: 11, fontWeight: '600', color: B.textMuted, marginTop: 8 },
  finValue: { fontSize: 18, fontWeight: '800', color: B.text, marginTop: 2 },
  finValueLg: { fontSize: 22, fontWeight: '800', color: B.text, marginTop: 2 },
  finSub: { fontSize: 10, fontWeight: '600', color: B.textMuted, marginTop: 2 },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  trendText: { fontSize: 12, fontWeight: '700' },

  // Cards
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: B.surface,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: B.text },

  // Chart
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    paddingTop: 10,
  },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartValue: { fontSize: 9, fontWeight: '700', color: B.textMuted, marginBottom: 4 },
  chartBar: { width: 24, borderRadius: 6, marginBottom: 6 },
  chartLabel: { fontSize: 11, fontWeight: '600', color: B.textMuted },
  chartOrders: { fontSize: 9, color: B.textMuted, marginTop: 1 },

  // Category Breakdown
  catBarRow: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 14, gap: 2 },
  catBarSegment: { borderRadius: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  catRowBorder: { borderBottomWidth: 1, borderBottomColor: B.border },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { fontSize: 13, fontWeight: '700', color: B.text },
  catRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catRevenue: { fontSize: 13, fontWeight: '700', color: B.text },
  catPct: { fontSize: 12, fontWeight: '600', color: B.textMuted, width: 36, textAlign: 'right' },

  // Top Products
  prodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  prodRank: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: B.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prodRankText: { fontSize: 12, fontWeight: '800', color: B.primary },
  prodInfo: { flex: 1 },
  prodName: { fontSize: 13, fontWeight: '700', color: B.text },
  prodMeta: { fontSize: 11, color: B.textMuted, marginTop: 2 },
  prodRevenue: { fontSize: 13, fontWeight: '800', color: B.text },

  // Metrics
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricItem: {
    width: '47%' as any,
    padding: 14,
    borderRadius: 12,
    backgroundColor: B.bg,
    alignItems: 'center',
  },
  metricValue: { fontSize: 20, fontWeight: '800' },
  metricLabel: { fontSize: 11, fontWeight: '600', color: B.textMuted, marginTop: 4 },
});

export default BrandAnalyticsScreen;
