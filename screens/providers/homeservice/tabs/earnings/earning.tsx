import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Calendar,
  Download,
  Filter,
  CreditCard,
  Star,
  Zap,
  Award,
  Target,
  Send,
  X,
  Activity,
  Wallet,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../../../hooks/useReduxHooks';
import {
  fetchEarningsData,
  refreshEarnings,
  requestPayout,
  selectEarningsStats,
  selectMonthlyData,
  selectRecentPayments,
  selectPerformanceMetrics,
  selectEarningsSummary,
  selectEarningsLoading,
  selectEarningsError,
} from './earningSlice';
import type { EarningsPeriod } from '../../../../../models/serviceProviders/earnings';
// Values come from the shared tokens via the provider bridge — see
// screens/providers/homeservice/providerTheme.ts.
import { T, W } from '../../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../../theme';
import { makeProviderTheme, type ProviderTheme } from '../../providerTheme';
import { AppBar, Screen } from '../../../../../components/ui';

const { width } = Dimensions.get('window');

// Design System - Matching reference design

const CARD_MARGIN = 12;
const CARD_WIDTH = (width - 40 - CARD_MARGIN) / 2;

interface PaymentItem {
  id: string;
  type: 'earning' | 'payout';
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  description: string;
}

// The four mock* constants that used to sit here fed this entire screen —
// every figure a provider saw (total earnings, monthly chart, recent payments,
// performance tier) was invented and identical for every account. The real
// GET /provider/earnings payload matches these shapes field for field, and
// fetchEarningsData has always existed to load it.

// One list of periods, shared by the chart's inline selector and the header
// filter, so the two can never drift apart.
const PERIOD_OPTIONS = [
  { key: 'W', label: 'This week' },
  { key: 'M', label: 'This month' },
  { key: 'Y', label: 'This year' },
] as const;
type PeriodKey = (typeof PERIOD_OPTIONS)[number]['key'];

/** The chips used to change nothing but their own highlight. They now choose what the server computes. */
const PERIOD_API: Record<PeriodKey, EarningsPeriod> = { W: 'week', M: 'month', Y: 'year' };

// Utility functions
const formatCurrency = (amount: number): string => {
  return `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;
};

/** Short bar label: 1350 → "1.4k", 800 → "800". */
const formatBar = (amount: number): string =>
  amount >= 1000 ? `${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k` : `${Math.round(amount)}`;

const pct = (value: number | null): string => (value === null || value === undefined ? '—' : `${value}%`);

/** A CSV cell: quoted, with quotes doubled. */
const csvCell = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function EarningsScreen() {
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);
  const dispatch = useAppDispatch();

  // Real figures, scoped to this provider by their own JWT.
  const stats = useAppSelector(selectEarningsStats);
  const monthlyData = useAppSelector(selectMonthlyData);
  const recentPayments = useAppSelector(selectRecentPayments);
  const performance = useAppSelector(selectPerformanceMetrics);
  const summary = useAppSelector(selectEarningsSummary);
  const loading = useAppSelector(selectEarningsLoading);
  const error = useAppSelector(selectEarningsError);

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('M');
  const period = PERIOD_API[selectedPeriod];
  const [showPeriodFilter, setShowPeriodFilter] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Refetch on focus, and whenever the period changes, so a job completed
  // since the last visit — or a different window — is what the screen shows.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchEarningsData({ period }));
    }, [dispatch, period])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(refreshEarnings({ period }));
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, period]);

  // What a payout may ask for is the server's figure: wallet balance minus
  // commissions still owed on cash jobs and payouts already requested. The
  // screen used to show — and check against — the PENDING payouts total,
  // which is usually zero, so no provider could ever withdraw anything.
  const available = summary.availableBalance;
  const minPayout = summary.minPayoutAmount;

  const handleRequestPayout = useCallback(async () => {
    const amount = Number(payoutAmount.replace(/[^0-9]/g, ''));
    if (!amount || amount <= 0) {
      Alert.alert('Enter an amount', 'Type how much you want to withdraw.');
      return;
    }
    if (amount < minPayout) {
      Alert.alert('Below the minimum', `The smallest payout is ${formatCurrency(minPayout)}.`);
      return;
    }
    if (amount > available) {
      Alert.alert('More than you can withdraw', `You can withdraw up to ${formatCurrency(available)} right now.`);
      return;
    }

    try {
      // This used to close the modal and claim success without asking the
      // server for anything.
      // 'bank' matches the backend default; a method picker is a separate
      // feature, not part of making this button honest.
      await dispatch(requestPayout({ amount, method: 'bank' })).unwrap();
      setShowPayoutModal(false);
      setPayoutAmount('');
      Alert.alert('Payout requested', `${formatCurrency(amount)} will be sent to your bank once approved.`);
      dispatch(fetchEarningsData({ period }));
    } catch (e) {
      Alert.alert(
        'Payout failed',
        typeof e === 'string' ? e : 'We could not submit your payout request.'
      );
    }
  }, [dispatch, payoutAmount, available, minPayout, period]);

  // Download: a CSV statement of the chosen period — the chart's buckets and
  // the latest payments — handed to the share sheet (save to Files, Drive,
  // email). Was a disabled "coming soon" button.
  const handleExport = useCallback(async () => {
    const periodLabel = PERIOD_OPTIONS.find((o) => o.key === selectedPeriod)?.label || '';
    const lines = [
      [csvCell('MetroMatrix earnings statement'), csvCell(periodLabel)].join(','),
      [csvCell('Net earnings in period'), csvCell(summary.periodEarnings), csvCell(`${summary.periodJobs} paid jobs`)].join(','),
      [csvCell('Available to withdraw'), csvCell(available)].join(','),
      '',
      [csvCell(summary.seriesTitle), csvCell('Net earnings (PKR)'), csvCell('Paid jobs')].join(','),
      ...summary.series.map((p) => [csvCell(p.key), csvCell(p.amount), csvCell(p.jobs)].join(',')),
      '',
      [csvCell('Date'), csvCell('Type'), csvCell('Description'), csvCell('Status'), csvCell('Amount (PKR)')].join(','),
      ...recentPayments.map((p) =>
        [csvCell(p.date ? p.date.slice(0, 10) : ''), csvCell(p.type), csvCell(p.description), csvCell(p.status), csvCell(p.amount)].join(',')
      ),
    ];
    const csv = lines.join('\n');
    const fileName = `metromatrix-earnings-${PERIOD_API[selectedPeriod]}-${new Date().toISOString().slice(0, 10)}.csv`;
    try {
      const FileSystem = require('expo-file-system/legacy');
      const Sharing = require('expo-sharing');
      const uri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: 'utf8' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Earnings statement', UTI: 'public.comma-separated-values-text' });
        return;
      }
    } catch {
      // No file sharing on this build — fall through to plain-text share.
    }
    await Share.share({ title: fileName, message: csv });
  }, [selectedPeriod, summary, available, recentPayments]);

  // Stats Card Component
  const StatsCard = ({
    title,
    value,
    icon: Icon,
    trend,
    color,
    bgColor,
    onPress,
  }: {
    title: string;
    value: string;
    icon: any;
    trend?: number;
    color: string;
    bgColor: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={styles.statsCard}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.statsCardHeader}>
        <View style={[styles.statsIcon, { backgroundColor: bgColor }]}>
          <Icon size={20} color={color} />
        </View>
        {trend !== undefined && (
          <View
            style={[
              styles.trendBadge,
              { backgroundColor: trend >= 0 ? colors.successSoft : colors.errorSoft },
            ]}
          >
            {trend >= 0 ? (
              <TrendingUp size={12} color={theme.colors.success} />
            ) : (
              <TrendingDown size={12} color={theme.colors.error} />
            )}
            <Text
              style={[
                styles.trendText,
                { color: trend >= 0 ? theme.colors.success : theme.colors.error },
              ]}
            >
              {Math.abs(trend).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </TouchableOpacity>
  );

  // Performance Section
  const PerformanceSection = () => (
    <View style={styles.performanceCard}>
      <View style={styles.performanceHeader}>
        <Activity size={20} color={theme.colors.primary} />
        <Text style={styles.performanceTitle}>Performance</Text>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <View style={[styles.metricIcon, { backgroundColor: colors.warningSoft }]}>
            <Star size={18} color={theme.colors.warning} />
          </View>
          <Text style={styles.metricValue}>{performance.avgRating ? performance.avgRating.toFixed(1) : '—'}</Text>
          <Text style={styles.metricLabel}>Rating</Text>
        </View>
        <View style={styles.metricItem}>
          <View style={[styles.metricIcon, { backgroundColor: colors.successSoft }]}>
            <Zap size={18} color={theme.colors.success} />
          </View>
          <Text style={styles.metricValue}>{pct(performance.onTimeRate)}</Text>
          <Text style={styles.metricLabel}>On-time</Text>
        </View>
        <View style={styles.metricItem}>
          <View style={[styles.metricIcon, { backgroundColor: theme.colors.warningSoft }]}>
            <Award size={18} color={theme.colors.warning} />
          </View>
          <Text style={styles.metricValue}>{performance.statusTier}</Text>
          <Text style={styles.metricLabel}>Tier</Text>
        </View>
        <View style={styles.metricItem}>
          <View style={[styles.metricIcon, { backgroundColor: colors.infoSoft }]}>
            <Target size={18} color={theme.colors.info} />
          </View>
          <Text style={styles.metricValue}>{pct(performance.repeatCustomerRate)}</Text>
          <Text style={styles.metricLabel}>Repeat</Text>
        </View>
      </View>
    </View>
  );

  // Chart Section
  const chartData = summary.series.length
    ? summary.series
    : monthlyData.map((d) => ({ key: d.month, label: d.month, amount: d.amount, jobs: d.jobs }));
  const ChartSection = () => {
    // A provider with no completed jobs yet has an empty series. Math.max() of
    // nothing is -Infinity, which turned every bar height into NaN.
    const maxAmount = chartData.length
      ? Math.max(...chartData.map((d) => d.amount), 1)
      : 1;

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>Earnings Trend</Text>
            <Text style={styles.chartSubtitle}>{summary.seriesTitle}</Text>
          </View>
          <View style={styles.periodSelector}>
            {PERIOD_OPTIONS.map(({ key: period }) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodBtn,
                  selectedPeriod === period && styles.periodBtnActive,
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text
                  style={[
                    styles.periodBtnText,
                    selectedPeriod === period && styles.periodBtnTextActive,
                  ]}
                >
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.chartContent}>
          {chartData.map((data, index) => {
            const barHeight = Math.max((data.amount / maxAmount) * 100, 8);
            const isActive = index === chartData.length - 1;

            return (
              <View key={data.key || index} style={styles.barContainer}>
                <Text style={styles.barAmount}>{formatBar(data.amount)}</Text>
                <View style={styles.barWrapper}>
                  <Animated.View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: isActive
                          ? theme.colors.primary
                          : theme.colors.border,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barMonth, isActive && styles.barMonthActive]}>
                  {data.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Payment Item Component
  const PaymentItemComponent = ({ item }: { item: PaymentItem }) => {
    const statusConfig = {
      completed: { color: theme.colors.success, bg: colors.successSoft, icon: CheckCircle2 },
      pending: { color: theme.colors.warning, bg: colors.warningSoft, icon: Clock },
      processing: { color: theme.colors.info, bg: colors.infoSoft, icon: CreditCard },
      failed: { color: theme.colors.error, bg: colors.errorSoft, icon: X },
    }[item.status];

    const StatusIcon = statusConfig.icon;

    return (
      <View style={styles.paymentItem}>
        <View style={[styles.paymentIcon, { backgroundColor: statusConfig.bg }]}>
          <StatusIcon size={18} color={statusConfig.color} />
        </View>
        <View style={styles.paymentContent}>
          <Text style={styles.paymentDesc} numberOfLines={1}>
            {item.description}
          </Text>
          <View style={styles.paymentMeta}>
            <Text style={styles.paymentDate}>{formatDate(item.date)}</Text>
            <View style={styles.metaDot} />
            <Text style={[styles.paymentStatus, { color: statusConfig.color }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.paymentAmount,
            { color: item.type === 'earning' ? theme.colors.success : theme.colors.text.primary },
          ]}
        >
          {item.type === 'earning' ? '+' : ''}
          {formatCurrency(item.amount)}
        </Text>
      </View>
    );
  };

  // Period filter. The Filter button used to be inert even though the chart
  // already had a W/M/Y control — this just surfaces it from the header.
  const renderPeriodFilterModal = () => (
    <Modal
      visible={showPeriodFilter}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPeriodFilter(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter by period</Text>
            <TouchableOpacity onPress={() => setShowPeriodFilter(false)}>
              <X size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {PERIOD_OPTIONS.map((option) => {
              const isActive = selectedPeriod === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.periodOption, isActive && styles.periodOptionActive]}
                  onPress={() => {
                    setSelectedPeriod(option.key);
                    setShowPeriodFilter(false);
                  }}
                >
                  <Calendar
                    size={18}
                    color={isActive ? theme.colors.primary : theme.colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.periodOptionText,
                      isActive && styles.periodOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isActive && <CheckCircle2 size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );

  // Payout Modal. A render function, not a component: declared as a component
  // inside this one it was a NEW component type on every render, so each
  // keystroke in the amount field remounted the modal and dropped the keyboard.
  const renderPayoutModal = () => (
    <Modal
      visible={showPayoutModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPayoutModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Payout</Text>
            <TouchableOpacity onPress={() => setShowPayoutModal(false)}>
              <X size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.availableBalance}>
              <Text style={styles.availableLabel}>Available to withdraw</Text>
              <Text style={styles.availableAmount}>{formatCurrency(available)}</Text>
              <Text style={styles.availableLabel}>Minimum payout {formatCurrency(minPayout)}</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Enter Amount</Text>
              <TextInput
                style={styles.input}
                value={payoutAmount}
                onChangeText={(t) => setPayoutAmount(t.replace(/[^0-9]/g, ''))}
                placeholder={`${minPayout} or more`}
                keyboardType="number-pad"
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, !payoutAmount && styles.submitBtnDisabled]}
              onPress={handleRequestPayout}
              disabled={!payoutAmount}
            >
              <Send size={18} color={theme.colors.text.inverse} />
              <Text style={styles.submitBtnText}>Submit Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <Screen>
      <AppBar
        title="Earnings"
        subtitle="Financial overview"
        hideBack
        right={
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowPeriodFilter(true)}
            accessibilityLabel="Filter earnings by period"
          >
            <Filter size={20} color={colors.inkInverse} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleExport}
            accessibilityLabel="Download earnings statement"
          >
            <Download size={20} color={colors.inkInverse} />
          </TouchableOpacity>
        </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* A failed fetch must be visible — otherwise the screen silently
            shows zeroes and looks like a provider with no earnings. */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText} numberOfLines={3}>{error}</Text>
            <TouchableOpacity
              style={styles.errorRetryBtn}
              onPress={() => dispatch(fetchEarningsData({ period }))}
            >
              <Text style={styles.errorRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cold load only — a pull-to-refresh has its own spinner. */}
        {loading && !stats.totalEarnings && !recentPayments.length && (
          <View style={styles.coldLoading}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatsCard
            title="Total Earnings"
            value={formatCurrency(stats.totalEarnings)}
            icon={Banknote}
            color={theme.colors.primary}
            bgColor={theme.colors.primaryLight}
          />
          <StatsCard
            title={PERIOD_OPTIONS.find((o) => o.key === selectedPeriod)?.label || 'This month'}
            value={formatCurrency(summary.periodEarnings)}
            icon={TrendingUp}
            trend={selectedPeriod === 'M' ? stats.monthlyGrowth : undefined}
            color={theme.colors.info}
            bgColor={colors.infoSoft}
          />
          <StatsCard
            title="Available · tap to withdraw"
            value={formatCurrency(available)}
            icon={Wallet}
            color={theme.colors.warning}
            bgColor={colors.warningSoft}
            onPress={() => setShowPayoutModal(true)}
          />
          {/* No trend badge here: the API sends growth for earnings only, and
              a hardcoded "+12.3%" on completed jobs was fiction. */}
          <StatsCard
            title="Completed"
            value={stats.completedJobsCount.toString()}
            icon={CheckCircle2}
            color={theme.colors.success}
            bgColor={theme.colors.successSoft}
          />
        </View>

        <PerformanceSection />
        <ChartSection />

        {/* Transactions */}
        <View style={styles.transactionsCard}>
          <View style={styles.transactionsHeader}>
            <View>
              <Text style={styles.transactionsTitle}>Recent Transactions</Text>
              <Text style={styles.transactionsSubtitle}>
                {recentPayments.length ? `Latest ${recentPayments.length}` : 'No payments yet'}
              </Text>
            </View>
          </View>

          <View style={styles.transactionsList}>
            {recentPayments.map((payment) => (
              <PaymentItemComponent key={payment.id} item={payment} />
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {renderPayoutModal()}
      {renderPeriodFilterModal()}
    </Screen>
  );
}

const makeStyles = (c: ThemeColors, theme: ProviderTheme) => StyleSheet.create({
  controlDisabled: {
    opacity: 0.4,
  },
  coldLoading: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: c.errorSoft,
    borderWidth: 1,
    borderColor: c.errorSoft,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    flex: 1,
    ...T.label,
    fontWeight: W.regular,

    color: theme.colors.error,
  },
  errorRetryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.error,
  },
  errorRetryText: {
    ...T.label,
    fontWeight: W.semibold,
    color: theme.colors.text.inverse,
  },
  headerBtnDisabled: {
    opacity: 0.4,
  },
  periodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
  },
  periodOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  periodOptionText: {
    flex: 1,
    ...T.body,
    fontWeight: W.medium,
    color: theme.colors.text.primary,
  },
  periodOptionTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: W.semibold,
  },
  headerSubtitle: {
    ...T.body,

    color: theme.colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  headerBtn: {
    width: 44,
    height: 44,
    backgroundColor: c.surfaceSunken,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_MARGIN,
    marginBottom: theme.spacing.xl,
  },
  statsCard: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  statsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
  },
  trendText: {
    ...T.caption,
    fontWeight: W.bold,
  },
  statsValue: {
    ...T.heading,
    fontWeight: W.bold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  statsTitle: {
    ...T.caption,
    fontWeight: W.medium,

    color: theme.colors.text.secondary,
  },
  performanceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  performanceTitle: {
    ...T.subhead,
    fontWeight: W.bold,
    color: theme.colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsBtnText: {
    ...T.bodyStrong,
    color: theme.colors.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    ...T.subhead,
    fontWeight: W.bold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  metricLabel: {
    ...T.caption,
    fontWeight: W.medium,

    color: theme.colors.text.secondary,
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
  },
  chartTitle: {
    ...T.subhead,
    fontWeight: W.bold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  chartSubtitle: {
    ...T.caption,

    color: theme.colors.text.secondary,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: c.surfaceSunken,
    borderRadius: 8,
    padding: 3,
  },
  periodBtn: {
    width: 32,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  periodBtnText: {
    ...T.caption,
    fontWeight: W.semibold,
    color: theme.colors.text.secondary,
  },
  periodBtnTextActive: {
    color: theme.colors.primary,
  },
  chartContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barAmount: {
    ...T.caption,
    fontWeight: W.semibold,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  barWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  bar: {
    width: 24,
    borderRadius: 4,
  },
  barMonth: {
    ...T.caption,
    fontWeight: W.semibold,
    color: theme.colors.text.tertiary,
  },
  barMonthActive: {
    color: theme.colors.primary,
  },
  transactionsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  transactionsTitle: {
    ...T.subhead,
    fontWeight: W.bold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  transactionsSubtitle: {
    ...T.caption,

    color: theme.colors.text.secondary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    ...T.bodyStrong,
    color: theme.colors.primary,
  },
  transactionsList: {
    gap: theme.spacing.sm,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceSunken,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  paymentContent: {
    flex: 1,
  },
  paymentDesc: {
    ...T.bodyStrong,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  paymentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentDate: {
    ...T.caption,

    color: theme.colors.text.tertiary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.border,
  },
  paymentStatus: {
    ...T.caption,
    fontWeight: W.semibold,
  },
  paymentAmount: {
    ...T.body,
    fontWeight: W.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...T.heading,
    fontWeight: W.bold,
    color: theme.colors.text.primary,
  },
  modalBody: {
    padding: theme.spacing.xl,
  },
  availableBalance: {
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  availableLabel: {
    ...T.caption,

    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  availableAmount: {
    ...T.title,
    color: theme.colors.primary,
  },
  inputContainer: {
    marginBottom: theme.spacing.xl,
  },
  inputLabel: {
    ...T.bodyStrong,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: c.surfaceSunken,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    ...T.heading,
    fontWeight: W.bold,
    color: theme.colors.text.primary,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: theme.colors.border,
  },
  submitBtnText: {
    ...T.subhead,
    fontWeight: W.bold,
    color: theme.colors.text.inverse,
  },
  bottomSpacer: {
    height: 100,
  },
});