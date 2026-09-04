import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DollarSign,
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
  ChevronRight,
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
  selectEarningsLoading,
  selectEarningsError,
} from './earningSlice';
// Values come from the shared tokens via the provider bridge — see
// screens/providers/homeservice/providerTheme.ts.
import { theme } from '../../providerTheme';

const { width } = Dimensions.get('window');

// Design System - Matching reference design

const CARD_MARGIN = 12;
const CARD_WIDTH = (width - 40 - CARD_MARGIN) / 2;

// Mock data
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

// Utility functions
const formatCurrency = (amount: number): string => {
  return `Rs ${amount.toLocaleString()}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function EarningsScreen() {
  const dispatch = useAppDispatch();

  // Real figures, scoped to this provider by their own JWT.
  const stats = useAppSelector(selectEarningsStats);
  const monthlyData = useAppSelector(selectMonthlyData);
  const recentPayments = useAppSelector(selectRecentPayments);
  const performance = useAppSelector(selectPerformanceMetrics);
  const loading = useAppSelector(selectEarningsLoading);
  const error = useAppSelector(selectEarningsError);

  const [selectedPeriod, setSelectedPeriod] = useState('M');
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

  // Refetch on focus so a job completed since the last visit is reflected.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchEarningsData());
    }, [dispatch])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(refreshEarnings());
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  const handleRequestPayout = useCallback(async () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (amount > stats.pendingPayouts) {
      Alert.alert('Insufficient Balance', 'Amount exceeds available balance');
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
      Alert.alert('Success', 'Payout request submitted successfully');
      dispatch(fetchEarningsData());
    } catch (e) {
      Alert.alert(
        'Payout failed',
        typeof e === 'string' ? e : 'We could not submit your payout request.'
      );
    }
  }, [dispatch, payoutAmount, stats.pendingPayouts]);

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
              { backgroundColor: trend >= 0 ? '#ECFDF5' : '#FEF2F2' },
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
        {/* No performance-breakdown screen exists yet. */}
        <TouchableOpacity style={[styles.detailsBtn, styles.controlDisabled]} disabled>
          <Text style={styles.detailsBtnText}>Details</Text>
          <ChevronRight size={14} color={theme.colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <View style={[styles.metricIcon, { backgroundColor: '#FFFBEB' }]}>
            <Star size={18} color={theme.colors.warning} />
          </View>
          <Text style={styles.metricValue}>{performance.avgRating}</Text>
          <Text style={styles.metricLabel}>Rating</Text>
        </View>
        <View style={styles.metricItem}>
          <View style={[styles.metricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Zap size={18} color={theme.colors.success} />
          </View>
          <Text style={styles.metricValue}>{performance.onTimeRate}%</Text>
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
          <View style={[styles.metricIcon, { backgroundColor: '#EFF6FF' }]}>
            <Target size={18} color={theme.colors.info} />
          </View>
          <Text style={styles.metricValue}>{performance.repeatCustomerRate}%</Text>
          <Text style={styles.metricLabel}>Repeat</Text>
        </View>
      </View>
    </View>
  );

  // Chart Section
  const ChartSection = () => {
    // A provider with no completed jobs yet has an empty series. Math.max() of
    // nothing is -Infinity, which turned every bar height into NaN.
    const maxAmount = monthlyData.length
      ? Math.max(...monthlyData.map((d) => d.amount), 1)
      : 1;

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>Earnings Trend</Text>
            <Text style={styles.chartSubtitle}>Last 6 months</Text>
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
          {monthlyData.map((data, index) => {
            const barHeight = Math.max((data.amount / maxAmount) * 100, 8);
            const isActive = index === monthlyData.length - 1;

            return (
              <View key={index} style={styles.barContainer}>
                <Text style={styles.barAmount}>
                  {(data.amount / 1000).toFixed(0)}k
                </Text>
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
                  {data.month}
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
      completed: { color: theme.colors.success, bg: '#ECFDF5', icon: CheckCircle2 },
      pending: { color: theme.colors.warning, bg: '#FFFBEB', icon: Clock },
      processing: { color: theme.colors.info, bg: '#EFF6FF', icon: CreditCard },
      failed: { color: theme.colors.error, bg: '#FEF2F2', icon: X },
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
  const PeriodFilterModal = () => (
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

  // Payout Modal
  const PayoutModal = () => (
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
              <Text style={styles.availableLabel}>Available Balance</Text>
              <Text style={styles.availableAmount}>
                {formatCurrency(stats.pendingPayouts)}
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Enter Amount</Text>
              <TextInput
                style={styles.input}
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                placeholder="0.00"
                keyboardType="numeric"
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Earnings</Text>
          <Text style={styles.headerSubtitle}>Financial overview</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowPeriodFilter(true)}
            accessibilityLabel="Filter earnings by period"
          >
            <Filter size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          {/* Export is not built yet. A disabled, dimmed control is honest;
              a tappable one that does nothing is the bug QA reported. */}
          <TouchableOpacity
            style={[styles.headerBtn, styles.headerBtnDisabled]}
            disabled
            accessibilityLabel="Download earnings report (coming soon)"
          >
            <Download size={20} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      </View>

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
              onPress={() => dispatch(fetchEarningsData())}
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
            icon={DollarSign}
            color={theme.colors.primary}
            bgColor={theme.colors.primaryLight}
          />
          <StatsCard
            title="This Month"
            value={formatCurrency(stats.thisMonthEarnings)}
            icon={TrendingUp}
            trend={stats.monthlyGrowth}
            color={theme.colors.info}
            bgColor="#EFF6FF"
          />
          <StatsCard
            title="Available"
            value={formatCurrency(stats.pendingPayouts)}
            icon={Wallet}
            color={theme.colors.warning}
            bgColor="#FFFBEB"
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
                {recentPayments.length} payments
              </Text>
            </View>
            {/* The API returns the 10 most recent payments; there is no
                paginated transaction history endpoint behind "View All". */}
            <TouchableOpacity style={[styles.viewAllBtn, styles.controlDisabled]} disabled>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={14} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.transactionsList}>
            {recentPayments.map((payment) => (
              <PaymentItemComponent key={payment.id} item={payment} />
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <PayoutModal />
      <PeriodFilterModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.error,
  },
  errorRetryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.error,
  },
  errorRetryText: {
    fontSize: 13,
    fontWeight: '600',
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
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  periodOptionTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  headerBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#F3F4F6',
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
    shadowColor: '#000',
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
    fontSize: 11,
    fontWeight: '700',
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  performanceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    shadowColor: '#000',
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
    fontSize: 18,
    fontWeight: '700',
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
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    shadowColor: '#000',
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
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  periodBtnText: {
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 10,
    fontWeight: '600',
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
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.tertiary,
  },
  barMonthActive: {
    color: theme.colors.primary,
  },
  transactionsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    shadowColor: '#000',
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
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  transactionsSubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  transactionsList: {
    gap: theme.spacing.sm,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
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
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  paymentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentDate: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.border,
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '700',
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
    fontSize: 20,
    fontWeight: '700',
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
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  availableAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  inputContainer: {
    marginBottom: theme.spacing.xl,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: 20,
    fontWeight: '700',
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
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.inverse,
  },
  bottomSpacer: {
    height: 100,
  },
});