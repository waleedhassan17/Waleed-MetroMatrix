import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import {
  fetchEarnings,
  fetchTransactions,
  setPeriodFilter,
  resetDoctorEarnings,
  PeriodFilter,
  EarningTransaction,
  ChartDataPoint,
  ConsultationBreakdown,
} from './doctorEarningsSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 160;

// ── Theme ─────────────────────────────────────

const THEME = {
  primary: '#2A7FFF',
  primaryLight: '#EAF3FF',
  accent: '#5A9FFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'] as [string, string],
    success: ['#10B981', '#059669'] as [string, string],
    secondary: ['#5A9FFF', '#1E6AE1'] as [string, string],
  },
};

// ── Period options ─────────────────────────────

const PERIOD_OPTIONS: { label: string; value: PeriodFilter; short: string }[] = [
  { label: 'Today',      value: 'today',     short: 'Today' },
  { label: 'This Week',  value: 'thisWeek',  short: 'Week' },
  { label: 'This Month', value: 'thisMonth', short: 'Month' },
  { label: 'Custom',     value: 'custom',    short: 'Custom' },
];

// ── Helpers ───────────────────────────────────

const formatCurrency = (amount: number, currency: string) =>
  `${currency} ${amount.toLocaleString()}`;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
};

// ── Bar Chart ─────────────────────────────────

const BarChart: React.FC<{ data: ChartDataPoint[]; currency: string }> = ({ data, currency }) => {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barAnims = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      40,
      barAnims.map((a) =>
        Animated.spring(a, { toValue: 1, tension: 80, friction: 8, useNativeDriver: false })
      )
    ).start();
  }, []);

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {data.map((point, idx) => {
          const heightPct = (point.value / maxVal) * CHART_HEIGHT;
          const anim = barAnims[idx] ?? new Animated.Value(1);
          return (
            <View key={idx} style={styles.chartBarCol}>
              {/* Value label */}
              <Text style={styles.chartBarValue}>
                {point.value >= 1000 ? `${(point.value / 1000).toFixed(0)}k` : point.value}
              </Text>

              {/* Bar track */}
              <View style={[styles.chartBarTrack, { height: CHART_HEIGHT }]}>
                <Animated.View
                  style={[
                    styles.chartBarFillWrap,
                    {
                      height: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, heightPct],
                      }),
                    },
                  ]}
                >
                  <LinearGradient
                    colors={THEME.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 6 }]}
                  />
                </Animated.View>
              </View>

              <Text style={styles.chartBarLabel}>{point.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ── Component ─────────────────────────────────

const DoctorEarningsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const {
    totalEarnings,
    periodFilter,
    transactions,
    chartData,
    breakdown,
    currency,
    loading,
    transactionsLoading,
    error,
  } = useAppSelector((state) => state.doctorEarnings);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const heroScaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    dispatch(fetchEarnings());
    dispatch(fetchTransactions());
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
      Animated.spring(heroScaleAnim, { toValue: 1, tension: 80, friction: 9, useNativeDriver: true }),
    ]).start();
    return () => { dispatch(resetDoctorEarnings()); };
  }, [dispatch]);

  const handlePeriodChange = useCallback(
    (period: PeriodFilter) => {
      dispatch(setPeriodFilter(period));
      dispatch(fetchEarnings(period));
    },
    [dispatch],
  );

  const currentPeriodLabel = PERIOD_OPTIONS.find((p) => p.value === periodFilter)?.label ?? 'This Month';

  // ── Loading ───────────────────────────────────

  if (loading && totalEarnings === 0 && chartData.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.loadingHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Earnings</Text>
          <View style={styles.backButton} />
        </LinearGradient>
        <View style={styles.centered}>
          <View style={styles.loadingIconWrap}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
          <Text style={styles.loadingText}>Loading earnings…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ─────────────────────────────────────

  if (error && totalEarnings === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.loadingHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Earnings</Text>
          <View style={styles.backButton} />
        </LinearGradient>
        <View style={styles.centered}>
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={40} color={THEME.error} />
          </LinearGradient>
          <Text style={styles.errorTitle}>Failed to load earnings</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchEarnings())} activeOpacity={0.85}>
            <LinearGradient colors={THEME.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.retryBtnGradient}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Transaction Item ──────────────────────────

  const renderTransaction = (txn: EarningTransaction) => {
    const statusConfig = {
      completed: { bg: '#DCFCE7', text: '#16A34A', dot: '#10B981' },
      pending:   { bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B' },
      refunded:  { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
    };
    const sc = statusConfig[txn.status] ?? statusConfig.pending;
    const isRefunded = txn.status === 'refunded';

    return (
      <View key={txn.transactionId} style={styles.txnCard}>
        <View style={[
          styles.txnIconWrap,
          { backgroundColor: txn.type === 'video' ? '#EAF3FF' : THEME.primaryLight },
        ]}>
          <Ionicons
            name={txn.type === 'video' ? 'videocam-outline' : 'business-outline'}
            size={18}
            color={txn.type === 'video' ? THEME.accent : THEME.primary}
          />
        </View>

        <View style={styles.txnInfo}>
          <Text style={styles.txnPatientName}>{txn.patientName}</Text>
          <View style={styles.txnMetaRow}>
            <Text style={styles.txnDate}>{formatDate(txn.date)} · {formatTime(txn.date)}</Text>
            <View style={[styles.txnStatusBadge, { backgroundColor: sc.bg }]}>
              <View style={[styles.txnStatusDot, { backgroundColor: sc.dot }]} />
              <Text style={[styles.txnStatusText, { color: sc.text }]}>
                {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.txnAmountBlock}>
          <Text style={[styles.txnAmount, { color: isRefunded ? THEME.error : THEME.success }]}>
            {isRefunded ? '−' : '+'}{formatCurrency(txn.amount, currency)}
          </Text>
          <Text style={styles.txnMethod}>{txn.method}</Text>
        </View>
      </View>
    );
  };

  // ── Main Render ───────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero Header ── */}
        <LinearGradient
          colors={THEME.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          {/* Nav row */}
          <View style={styles.heroNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Earnings</Text>
            <TouchableOpacity style={styles.backButton}>
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Total amount */}
          <Animated.View style={[styles.heroAmountBlock, { transform: [{ scale: heroScaleAnim }] }]}>
            <Text style={styles.heroAmountLabel}>{currentPeriodLabel} Earnings</Text>
            <Text style={styles.heroAmount}>{formatCurrency(totalEarnings, currency)}</Text>
            <View style={styles.heroTrendBadge}>
              <Ionicons name="trending-up" size={13} color="#FFFFFF" />
              <Text style={styles.heroTrendText}>+12% vs last period</Text>
            </View>
          </Animated.View>

          {/* Period filter */}
          <View style={styles.periodFilter}>
            {PERIOD_OPTIONS.map((opt) => {
              const isActive = periodFilter === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.periodTab, isActive && styles.periodTabActive]}
                  onPress={() => handlePeriodChange(opt.value)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.periodTabText, isActive && styles.periodTabTextActive]}>
                    {opt.short}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>

        {/* ── Chart ── */}
        {chartData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Earnings Overview</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{chartData.length} points</Text>
              </View>
            </View>
            <View style={styles.card}>
              <BarChart data={chartData} currency={currency} />
            </View>
          </View>
        )}

        {/* ── Consultation Breakdown ── */}
        {breakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Consultation Type</Text>
            <View style={styles.breakdownRow}>
              {breakdown.map((item: ConsultationBreakdown) => {
                const isVideo = item.type === 'video';
                const gradient = isVideo ? THEME.gradient.secondary : THEME.gradient.primary;
                return (
                  <View key={item.type} style={styles.breakdownCard}>
                    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.breakdownIconGradient}>
                      <Ionicons name={isVideo ? 'videocam-outline' : 'business-outline'} size={20} color="#FFFFFF" />
                    </LinearGradient>

                    <Text style={styles.breakdownTypeLabel}>
                      {isVideo ? 'Video' : 'In-Clinic'}
                    </Text>

                    <Text style={styles.breakdownAmount}>
                      {formatCurrency(item.total, currency)}
                    </Text>

                    {/* Progress bar */}
                    <View style={styles.breakdownBarTrack}>
                      <View style={[styles.breakdownBarFill, {
                        width: `${item.percentage}%`,
                        backgroundColor: isVideo ? THEME.accent : THEME.primary,
                      }]} />
                    </View>

                    <Text style={styles.breakdownMeta}>
                      {item.count} consults · {item.percentage}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Transactions ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.length > 0 && (
              <View style={[styles.sectionBadge, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[styles.sectionBadgeText, { color: THEME.success }]}>{transactions.length}</Text>
              </View>
            )}
          </View>

          {transactionsLoading ? (
            <View style={styles.txnLoadingWrap}>
              <ActivityIndicator size="small" color={THEME.primary} />
              <Text style={styles.txnLoadingText}>Loading transactions…</Text>
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <LinearGradient colors={['#F0F7FF', '#D6E8FF']} style={styles.emptyIconWrap}>
                <MaterialCommunityIcons name="receipt" size={32} color={THEME.primary} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>Your completed consultations will appear here</Text>
            </View>
          ) : (
            <View style={styles.txnList}>
              {transactions.map(renderTransaction)}
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },

  // Loading/Error
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 10 : 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  loadingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 6,
  },
  retryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  retryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  scrollContent: {
    paddingBottom: 40,
  },

  // Hero
  heroSection: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
    paddingBottom: 24,
    overflow: 'hidden',
  },

  heroNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'center',
  },
  heroAmountBlock: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  heroAmountLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  heroAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 10,
  },
  heroTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  heroTrendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Period filter
  periodFilter: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodTabActive: {
    backgroundColor: '#FFFFFF',
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
  periodTabTextActive: {
    color: THEME.primary,
  },

  // Section
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },

  // Bar chart
  chartContainer: {
    height: CHART_HEIGHT + 40,
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingBottom: 24,
  },
  chartBarCol: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  chartBarTrack: {
    width: '68%',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFillWrap: {
    width: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  chartBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 6,
    position: 'absolute',
    bottom: 0,
  },

  // Breakdown
  breakdownRow: {
    flexDirection: 'row',
    gap: 12,
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  breakdownIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakdownTypeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  breakdownBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: 6,
    borderRadius: 3,
  },
  breakdownMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },

  // Transactions
  txnList: {
    gap: 8,
  },
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  txnIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txnInfo: {
    flex: 1,
    gap: 4,
  },
  txnPatientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  txnMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  txnDate: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  txnStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  txnStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  txnStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  txnAmountBlock: {
    alignItems: 'flex-end',
    gap: 3,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  txnMethod: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'capitalize',
  },
  txnLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 32,
  },
  txnLoadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },

  // Empty
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
  },
});

export default DoctorEarningsScreen;