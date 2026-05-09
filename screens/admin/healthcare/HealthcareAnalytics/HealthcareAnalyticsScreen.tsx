import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import {
  fetchAnalytics,
  exportReport,
  setDateRange,
  selectAnalyticsStats,
  selectChartData,
  selectDateRange,
  selectAnalyticsLoading,
  selectIsExporting,
} from './healthcareAnalyticsSlice';
import type { HealthcareAnalyticsStats, TopSpecialty, TopDoctor, SatisfactionData } from './healthcareAnalyticsSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 44;

// ============================================
// THEME COLORS
// ============================================

const COLORS = {
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  background: '#f1f5f9',
  surface: '#ffffff',
  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    tertiary: '#94a3b8',
    inverse: '#ffffff',
  },
  border: '#e2e8f0',
  success: '#10b981',
  successLight: '#d1fae5',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  error: '#ef4444',
  errorLight: '#fee2e2',
  info: '#3b82f6',
  infoLight: '#dbeafe',
  shadow: 'rgba(15, 23, 42, 0.08)',
};

const GRADIENTS = {
  purple: ['#8b5cf6', '#a855f7'] as const,
  blue: ['#6366f1', '#818cf8'] as const,
  green: ['#10b981', '#34d399'] as const,
  orange: ['#f59e0b', '#fbbf24'] as const,
  red: ['#ef4444', '#f87171'] as const,
  teal: ['#14b8a6', '#2dd4bf'] as const,
};

// ============================================
// DATE RANGE OPTIONS
// ============================================

const DATE_RANGES = [
  { label: 'Last 7 Days', start: '7d', end: 'now' },
  { label: 'Last 30 Days', start: '30d', end: 'now' },
  { label: 'Last 6 Months', start: '6m', end: 'now' },
  { label: 'This Year', start: 'year', end: 'now' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
};

const formatCurrency = (num: number): string => {
  if (num >= 1000000) return 'PKR ' + (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return 'PKR ' + (num / 1000).toFixed(0) + 'K';
  return 'PKR ' + num.toLocaleString();
};

const getInitials = (name: string): string => {
  return name
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  trend?: number;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  gradient,
  trend,
  delay = 0,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 65,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View
      style={[
        styles.statCardWrapper,
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statGradient}
      >
        <View style={styles.statIconWrapper}>
          <Ionicons name={icon} size={22} color="rgba(255,255,255,0.95)" />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
        {trend !== undefined && (
          <View style={styles.trendContainer}>
            <Ionicons
              name={trend >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={trend >= 0 ? 'rgba(255,255,255,0.9)' : '#fecaca'}
            />
            <Text
              style={[
                styles.trendText,
                { color: trend >= 0 ? 'rgba(255,255,255,0.9)' : '#fecaca' },
              ]}
            >
              {trend >= 0 ? '+' : ''}
              {trend.toFixed(1)}%
            </Text>
          </View>
        )}
        {subtitle && !trend && (
          <Text style={styles.statSubtitle}>{subtitle}</Text>
        )}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
      </LinearGradient>
    </Animated.View>
  );
};

// ============================================
// SECTION CARD COMPONENT
// ============================================

interface SectionCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, icon, children, rightAction }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionIconBg}>
          <Ionicons name={icon} size={18} color={COLORS.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {rightAction}
    </View>
    {children}
  </View>
);

// ============================================
// BAR CHART COMPONENT
// ============================================

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
  showValues?: boolean;
  formatValue?: (val: number) => string;
}

const SimpleBarChart: React.FC<BarChartProps> = ({
  data,
  maxValue,
  showValues = true,
  formatValue = (v) => formatNumber(v),
}) => {
  const max = maxValue || Math.max(...data.map((d) => d.value));

  return (
    <View style={styles.barChart}>
      {data.map((item, index) => {
        const barWidth = max > 0 ? (item.value / max) * 100 : 0;
        return (
          <View key={index} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${barWidth}%`,
                    backgroundColor: item.color || COLORS.primary,
                  },
                ]}
              />
            </View>
            {showValues && (
              <Text style={styles.barValue}>{formatValue(item.value)}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
};

// ============================================
// MAIN SCREEN COMPONENT
// ============================================

const HealthcareAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const stats: HealthcareAnalyticsStats = useAppSelector(selectAnalyticsStats);
  const chartData = useAppSelector(selectChartData);
  const dateRange = useAppSelector(selectDateRange);
  const loading = useAppSelector(selectAnalyticsLoading);
  const isExporting = useAppSelector(selectIsExporting);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState(2); // Last 6 Months
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dispatch(fetchAnalytics({ start: dateRange.start, end: dateRange.end }));
  }, [dateRange]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchAnalytics({ start: dateRange.start, end: dateRange.end }));
    setRefreshing(false);
  }, [dateRange]);

  const handleDateRangeSelect = (index: number) => {
    setSelectedDateRange(index);
    const range = DATE_RANGES[index];
    const end = new Date().toISOString().split('T')[0];
    let start = end;
    const now = new Date();
    switch (range.start) {
      case '7d':
        now.setDate(now.getDate() - 7);
        start = now.toISOString().split('T')[0];
        break;
      case '30d':
        now.setDate(now.getDate() - 30);
        start = now.toISOString().split('T')[0];
        break;
      case '6m':
        now.setMonth(now.getMonth() - 6);
        start = now.toISOString().split('T')[0];
        break;
      case 'year':
        start = `${now.getFullYear()}-01-01`;
        break;
    }
    dispatch(setDateRange({ start, end }));
  };

  const handleExport = (format: 'pdf' | 'csv') => {
    dispatch(exportReport(format));
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Header */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Healthcare Analytics</Text>
            <Text style={styles.headerSubtitle}>Dashboard Overview</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleExport('pdf')}
            style={styles.exportButton}
            activeOpacity={0.7}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="download-outline" size={22} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Date Range Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRangeContainer}
        >
          {DATE_RANGES.map((range, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleDateRangeSelect(index)}
              style={[
                styles.dateRangeChip,
                selectedDateRange === index && styles.dateRangeChipActive,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateRangeText,
                  selectedDateRange === index && styles.dateRangeTextActive,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Main Content */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* ========== STAT CARDS ========== */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Appointments"
            value={formatNumber(stats.appointments.total)}
            icon="calendar"
            gradient={GRADIENTS.blue}
            trend={12.3}
            delay={0}
          />
          <StatCard
            title="Completion Rate"
            value={`${stats.appointments.completionRate}%`}
            icon="checkmark-circle"
            gradient={GRADIENTS.green}
            subtitle="of all appointments"
            delay={100}
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.revenue.total)}
            icon="cash"
            gradient={GRADIENTS.purple}
            trend={stats.revenue.growth}
            delay={200}
          />
          <StatCard
            title="Patient Satisfaction"
            value={`${stats.satisfaction.averageScore}/5`}
            icon="star"
            gradient={GRADIENTS.orange}
            subtitle={`${formatNumber(stats.satisfaction.totalReviews)} reviews`}
            delay={300}
          />
        </View>

        {/* ========== CONSULTATION BREAKDOWN ========== */}
        <SectionCard title="Consultation Type Breakdown" icon="videocam">
          <View style={styles.breakdownContainer}>
            {/* Video */}
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <View style={[styles.breakdownDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.breakdownLabel}>Video Consultations</Text>
              </View>
              <Text style={styles.breakdownValue}>
                {formatNumber(stats.consultationBreakdown.video)}
              </Text>
              <View style={styles.breakdownBarTrack}>
                <View
                  style={[
                    styles.breakdownBarFill,
                    {
                      width: `${stats.consultationBreakdown.videoPercentage}%`,
                      backgroundColor: COLORS.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.breakdownPercent}>
                {stats.consultationBreakdown.videoPercentage}%
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.breakdownDivider} />

            {/* In-Clinic */}
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <View style={[styles.breakdownDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.breakdownLabel}>In-Clinic Visits</Text>
              </View>
              <Text style={styles.breakdownValue}>
                {formatNumber(stats.consultationBreakdown.inClinic)}
              </Text>
              <View style={styles.breakdownBarTrack}>
                <View
                  style={[
                    styles.breakdownBarFill,
                    {
                      width: `${stats.consultationBreakdown.inClinicPercentage}%`,
                      backgroundColor: COLORS.success,
                    },
                  ]}
                />
              </View>
              <Text style={styles.breakdownPercent}>
                {stats.consultationBreakdown.inClinicPercentage}%
              </Text>
            </View>
          </View>
        </SectionCard>

        {/* ========== TOP SPECIALTIES ========== */}
        <SectionCard title="Top Specialties" icon="medical">
          <SimpleBarChart
            data={stats.topSpecialties.map((s: TopSpecialty) => ({
              label: s.name,
              value: s.appointments,
              color: s.color,
            }))}
            formatValue={(v) => formatNumber(v) + ' apt'}
          />
        </SectionCard>

        {/* ========== TOP DOCTORS ========== */}
        <SectionCard title="Top Doctors" icon="people">
          {stats.topDoctors.map((doctor: TopDoctor, index: number) => (
            <View
              key={doctor.id}
              style={[
                styles.doctorRow,
                index < stats.topDoctors.length - 1 && styles.doctorRowBorder,
              ]}
            >
              <View style={styles.doctorRank}>
                <Text style={styles.doctorRankText}>#{index + 1}</Text>
              </View>
              <View
                style={[
                  styles.doctorAvatar,
                  {
                    backgroundColor:
                      ['#dbeafe', '#ede9fe', '#d1fae5', '#fee2e2', '#fef3c7'][index] || '#f1f5f9',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.doctorAvatarText,
                    {
                      color:
                        ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b'][index] || '#64748b',
                    },
                  ]}
                >
                  {getInitials(doctor.name)}
                </Text>
              </View>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{doctor.name}</Text>
                <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
              </View>
              <View style={styles.doctorStats}>
                <View style={styles.doctorStatRow}>
                  <Ionicons name="calendar-outline" size={12} color={COLORS.text.tertiary} />
                  <Text style={styles.doctorStatText}>{doctor.appointments}</Text>
                </View>
                <View style={styles.doctorStatRow}>
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text style={styles.doctorStatText}>{doctor.rating}</Text>
                </View>
                <Text style={styles.doctorRevenue}>{formatCurrency(doctor.revenue)}</Text>
              </View>
            </View>
          ))}
        </SectionCard>

        {/* ========== REVENUE TREND ========== */}
        <SectionCard title="Revenue Trend" icon="trending-up">
          <SimpleBarChart
            data={stats.revenue.monthly.map((m: { month: string; amount: number }) => ({
              label: m.month,
              value: m.amount,
              color: COLORS.primary,
            }))}
            formatValue={formatCurrency}
          />
          <View style={styles.revenueSummary}>
            <View style={styles.revenueSummaryItem}>
              <Text style={styles.revenueSummaryLabel}>Total Revenue</Text>
              <Text style={styles.revenueSummaryValue}>
                {formatCurrency(stats.revenue.total)}
              </Text>
            </View>
            <View style={styles.revenueSummaryDivider} />
            <View style={styles.revenueSummaryItem}>
              <Text style={styles.revenueSummaryLabel}>Growth</Text>
              <View style={styles.revenueSummaryGrowth}>
                <Ionicons name="trending-up" size={16} color={COLORS.success} />
                <Text style={[styles.revenueSummaryValue, { color: COLORS.success }]}>
                  +{stats.revenue.growth}%
                </Text>
              </View>
            </View>
          </View>
        </SectionCard>

        {/* ========== PATIENT SATISFACTION ========== */}
        <SectionCard title="Patient Satisfaction" icon="happy">
          <View style={styles.satisfactionHeader}>
            <View style={styles.satisfactionScore}>
              <Text style={styles.satisfactionScoreValue}>
                {stats.satisfaction.averageScore}
              </Text>
              <Ionicons name="star" size={28} color="#f59e0b" />
            </View>
            <Text style={styles.satisfactionReviews}>
              Based on {formatNumber(stats.satisfaction.totalReviews)} reviews
            </Text>
          </View>
          {stats.satisfaction.distribution.map((item: SatisfactionData['distribution'][number]) => (
            <View key={item.stars} style={styles.satisfactionRow}>
              <Text style={styles.satisfactionStars}>{item.stars} ★</Text>
              <View style={styles.satisfactionBarTrack}>
                <View
                  style={[
                    styles.satisfactionBarFill,
                    {
                      width: `${item.percentage}%`,
                      backgroundColor:
                        item.stars >= 4
                          ? COLORS.success
                          : item.stars === 3
                          ? COLORS.warning
                          : COLORS.error,
                    },
                  ]}
                />
              </View>
              <Text style={styles.satisfactionPercent}>{item.percentage}%</Text>
            </View>
          ))}
        </SectionCard>

        {/* ========== APPOINTMENT BREAKDOWN ========== */}
        <SectionCard title="Appointment Status" icon="pie-chart">
          <View style={styles.appointmentStatusGrid}>
            {[
              {
                label: 'Completed',
                value: stats.appointments.completed,
                icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
                color: COLORS.success,
                bg: COLORS.successLight,
              },
              {
                label: 'Cancelled',
                value: stats.appointments.cancelled,
                icon: 'close-circle' as keyof typeof Ionicons.glyphMap,
                color: COLORS.error,
                bg: COLORS.errorLight,
              },
              {
                label: 'No Show',
                value: stats.appointments.noShow,
                icon: 'alert-circle' as keyof typeof Ionicons.glyphMap,
                color: COLORS.warning,
                bg: COLORS.warningLight,
              },
              {
                label: 'Total',
                value: stats.appointments.total,
                icon: 'calendar' as keyof typeof Ionicons.glyphMap,
                color: COLORS.info,
                bg: COLORS.infoLight,
              },
            ].map((item, index) => (
              <View key={index} style={styles.appointmentStatusCard}>
                <View style={[styles.appointmentStatusIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={styles.appointmentStatusValue}>
                  {formatNumber(item.value)}
                </Text>
                <Text style={styles.appointmentStatusLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        {/* ========== QUICK ACTIONS ========== */}
        <View style={styles.exportSection}>
          <Text style={styles.exportTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => (navigation as any).navigate('SpecialtyManagement')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#8b5cf6' + '15' }]}>  
              <Ionicons name="medical" size={20} color="#8b5cf6" />
            </View>
            <View style={styles.quickActionText}>
              <Text style={styles.quickActionTitle}>Specialty Management</Text>
              <Text style={styles.quickActionSubtitle}>Manage specialties, conditions & doctors</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* ========== EXPORT OPTIONS ========== */}
        <View style={styles.exportSection}>
          <Text style={styles.exportTitle}>Export Report</Text>
          <View style={styles.exportButtons}>
            <TouchableOpacity
              style={[styles.exportBtn, styles.exportBtnPdf]}
              onPress={() => handleExport('pdf')}
              activeOpacity={0.7}
              disabled={isExporting}
            >
              <Ionicons name="document-text" size={20} color={COLORS.error} />
              <Text style={[styles.exportBtnText, { color: COLORS.error }]}>PDF Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportBtn, styles.exportBtnCsv]}
              onPress={() => handleExport('csv')}
              activeOpacity={0.7}
              disabled={isExporting}
            >
              <Ionicons name="grid" size={20} color={COLORS.success} />
              <Text style={[styles.exportBtnText, { color: COLORS.success }]}>CSV Data</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.text.secondary,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? STATUS_BAR_HEIGHT + 8 : 8,
    paddingBottom: 16,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Date Range
  dateRangeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dateRangeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dateRangeChipActive: {
    backgroundColor: '#ffffff',
  },
  dateRangeText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  dateRangeTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
  },

  // Stat Cards
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginBottom: 16,
  },
  statCardWrapper: {
    width: CARD_WIDTH,
  },
  statGradient: {
    borderRadius: 16,
    padding: 16,
    minHeight: 130,
    overflow: 'hidden',
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  decorCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // Section Card
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },

  // Consultation Breakdown
  breakdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownItem: {
    flex: 1,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  breakdownBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownPercent: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 4,
    fontWeight: '500',
  },
  breakdownDivider: {
    width: 1,
    height: 80,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },

  // Bar Chart
  barChart: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    width: 80,
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    width: 60,
    fontSize: 12,
    color: COLORS.text.primary,
    fontWeight: '600',
    textAlign: 'right',
  },

  // Doctor Row
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  doctorRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  doctorRank: {
    width: 24,
    alignItems: 'center',
  },
  doctorRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text.tertiary,
  },
  doctorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorAvatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  doctorSpecialty: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  doctorStats: {
    alignItems: 'flex-end',
    gap: 2,
  },
  doctorStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doctorStatText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  doctorRevenue: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },

  // Revenue Summary
  revenueSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  revenueSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenueSummaryLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  revenueSummaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  revenueSummaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  revenueSummaryGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Satisfaction
  satisfactionHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  satisfactionScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  satisfactionScoreValue: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  satisfactionReviews: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  satisfactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  satisfactionStars: {
    width: 32,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  satisfactionBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  satisfactionBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  satisfactionPercent: {
    width: 36,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
    textAlign: 'right',
  },

  // Appointment Status
  appointmentStatusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  appointmentStatusCard: {
    width: (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - 32 - 10) / 2,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  appointmentStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentStatusValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  appointmentStatusLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },

  // Export
  exportSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  exportBtnPdf: {
    borderColor: COLORS.errorLight,
    backgroundColor: '#fef2f2',
  },
  exportBtnCsv: {
    borderColor: COLORS.successLight,
    backgroundColor: '#f0fdf4',
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Quick Actions
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
});

export default HealthcareAnalyticsScreen;
