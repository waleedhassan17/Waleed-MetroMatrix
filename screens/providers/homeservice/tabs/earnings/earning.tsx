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

const { width } = Dimensions.get('window');

// Design System - Matching reference design
const theme = {
  colors: {
    primary: '#059669',
    primaryDark: '#047857',
    primaryLight: '#D1FAE5',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      inverse: '#FFFFFF',
    },
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    purple: '#8B5CF6',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
};

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

const mockStats = {
  totalEarnings: 145600,
  thisMonthEarnings: 34200,
  pendingPayouts: 12400,
  completedJobsCount: 87,
  monthlyGrowth: 15.3,
};

const mockMonthlyData = [
  { month: 'Aug', amount: 18500, jobs: 12 },
  { month: 'Sep', amount: 22100, jobs: 15 },
  { month: 'Oct', amount: 28400, jobs: 18 },
  { month: 'Nov', amount: 31200, jobs: 21 },
  { month: 'Dec', amount: 26800, jobs: 16 },
  { month: 'Jan', amount: 34200, jobs: 19 },
];

const mockRecentPayments: PaymentItem[] = [
  {
    id: '1',
    description: 'AC Installation Service',
    amount: 8500,
    date: '2026-01-24',
    status: 'completed',
    type: 'earning',
  },
  {
    id: '2',
    description: 'Plumbing Repair',
    amount: 3200,
    date: '2026-01-23',
    status: 'pending',
    type: 'earning',
  },
  {
    id: '3',
    description: 'Payout to Bank Account',
    amount: 5000,
    date: '2026-01-22',
    status: 'processing',
    type: 'payout',
  },
  {
    id: '4',
    description: 'Electrical Work',
    amount: 2800,
    date: '2026-01-20',
    status: 'completed',
    type: 'earning',
  },
];

const mockPerformance = {
  avgRating: 4.8,
  onTimeRate: 96,
  statusTier: 'Gold',
  repeatCustomerRate: 78,
};

// Utility functions
const formatCurrency = (amount: number): string => {
  return `Rs ${amount.toLocaleString()}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function EarningsScreen() {
  const [stats] = useState(mockStats);
  const [monthlyData] = useState(mockMonthlyData);
  const [recentPayments] = useState(mockRecentPayments);
  const [performance] = useState(mockPerformance);
  const [selectedPeriod, setSelectedPeriod] = useState('M');
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleRequestPayout = useCallback(() => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (amount > stats.pendingPayouts) {
      Alert.alert('Insufficient Balance', 'Amount exceeds available balance');
      return;
    }
    setShowPayoutModal(false);
    setPayoutAmount('');
    Alert.alert('Success', 'Payout request submitted successfully');
  }, [payoutAmount, stats.pendingPayouts]);

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
        <TouchableOpacity style={styles.detailsBtn}>
          <Text style={styles.detailsBtnText}>Details</Text>
          <ChevronRight size={14} color={theme.colors.primary} />
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
          <View style={[styles.metricIcon, { backgroundColor: '#EDE9FE' }]}>
            <Award size={18} color={theme.colors.purple} />
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
    const maxAmount = Math.max(...monthlyData.map((d) => d.amount));

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>Earnings Trend</Text>
            <Text style={styles.chartSubtitle}>Last 6 months</Text>
          </View>
          <View style={styles.periodSelector}>
            {['W', 'M', 'Y'].map((period) => (
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
          <TouchableOpacity style={styles.headerBtn}>
            <Filter size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Download size={20} color={theme.colors.text.secondary} />
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
          <StatsCard
            title="Completed"
            value={stats.completedJobsCount.toString()}
            icon={CheckCircle2}
            trend={12.3}
            color={theme.colors.purple}
            bgColor="#EDE9FE"
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
            <TouchableOpacity style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={14} color={theme.colors.primary} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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