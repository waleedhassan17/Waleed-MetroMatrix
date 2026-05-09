import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
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
import { fetchDashboardData, refreshDashboard } from './doctorDashboardSlice';
import type { DoctorDashboardState } from './doctorDashboardSlice';
import { DoctorRouteNames } from '../../../../navigation-maps/Healthcare';
import type { Appointment } from '../../../../models/healthcare/types';
import SlideOutSidebar from '../../../../components/SlideOutSidebar/SlideOutSidebar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;

// ── Theme ─────────────────────────────────────

const THEME = {
  primary: '#2A7FFF',
  primaryDark: '#1E6AE1',
  primaryLight: '#EAF3FF',
  primarySoft: '#F0F7FF',
  accent: '#5A9FFF',
  accentLight: '#D6E8FF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  textDark: '#1A1A1A',
  textMedium: '#2D3748',
  textLight: '#64748B',
  cardBg: '#FFFFFF',
  pageBg: '#F8FBFF',
  border: '#D6E8FF',
  gradient: {
    primary: ['#2A7FFF', '#1E6AE1'] as [string, string],
    soft: ['#EAF3FF', '#D6E8FF'] as [string, string],
    success: ['#10B981', '#059669'] as [string, string],
    warm: ['#F59E0B', '#EF4444'] as [string, string],
    secondary: ['#5A9FFF', '#1E6AE1'] as [string, string],
  },
};

// ── Helpers ───────────────────────────────────

const formatTime = (time: string) => {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${suffix}`;
};

const formatCurrency = (amount: number, currency: string) =>
  `${currency} ${amount.toLocaleString()}`;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

// ── Stat Card ─────────────────────────────────

const StatCard: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  gradient: [string, string];
  delay: number;
}> = ({ icon, label, value, gradient, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.statCard,
        {
          opacity: anim,
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
        },
      ]}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statGradient}>
        <View style={styles.statIconWrap}>
          <Ionicons name={icon} size={18} color="rgba(255,255,255,0.9)" />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </LinearGradient>
    </Animated.View>
  );
};

// ── Component ─────────────────────────────────

const DoctorHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const { doctorName, todayStats, upcomingAppointments, earnings, loading, error } =
    useAppSelector((state) => state.doctorDashboard) as DoctorDashboardState;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    dispatch(fetchDashboardData());
  }, [dispatch]);

  useEffect(() => {
    if (!loading && initialLoadDone.current && !hasAnimated.current) {
      hasAnimated.current = true;
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
      ]).start();
    }
    if (loading) {
      initialLoadDone.current = true;
    }
  }, [loading]);

  const handleRefresh = useCallback(() => {
    dispatch(refreshDashboard());
  }, [dispatch]);

  const nextAppointment = upcomingAppointments.find(
    (a: Appointment) => a.status === 'confirmed' || a.status === 'pending',
  );

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: 'clamp' });

  // ── Loading ───────────────────────────────────

  if (loading && !doctorName) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={THEME.pageBg} />
        <View style={styles.loadingWrap}>
          <View style={styles.loadingIconWrap}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
          <Text style={styles.loadingText}>Loading dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ─────────────────────────────────────

  if (error && !doctorName) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={THEME.pageBg} />
        <View style={styles.centered}>
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={40} color={THEME.error} />
          </LinearGradient>
          <Text style={styles.errorTitle}>Failed to load dashboard</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchDashboardData())} activeOpacity={0.85}>
            <LinearGradient colors={THEME.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.retryBtnGradient}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.pageBg} translucent />

      {/* Floating scroll header */}
      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
        <Text style={styles.floatingHeaderTitle}>Dashboard</Text>
      </Animated.View>

      {/* Sidebar Component */}
      <SlideOutSidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            colors={[THEME.primary]}
            tintColor={THEME.primary}
          />
        }
      >
        {/* ── Header with subtle gradient ── */}
        <LinearGradient
          colors={['#FFFFFF', THEME.pageBg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.headerSection}
        >
          <View style={styles.headerTopRow}>
            <View style={styles.welcomeLeft}>
              <Text style={styles.greetingText}>{getGreeting()} 👋</Text>
              <Text style={styles.doctorNameText} numberOfLines={1}>{doctorName}</Text>
            </View>
            {/* Hamburger Menu - Opens Centralized Sidebar */}
            <TouchableOpacity 
              style={styles.headerIconBtn} 
              onPress={() => setSidebarVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="menu" size={24} color={THEME.primary} />
            </TouchableOpacity>
          </View>

          {/* Stats Cards Row */}
          <View style={styles.statsRow}>
            {[
              { icon: 'calendar' as const, label: 'Total', value: todayStats.totalAppointments, color: THEME.primary, bg: THEME.primaryLight },
              { icon: 'people' as const, label: 'Seen', value: todayStats.patientsSeen, color: THEME.success, bg: '#ECFDF5' },
              { icon: 'time-outline' as const, label: 'Pending', value: todayStats.pending, color: THEME.warning, bg: '#FFFBEB' },
              { icon: 'close-circle-outline' as const, label: 'Cancelled', value: todayStats.cancelled, color: THEME.error, bg: '#FEF2F2' },
            ].map((stat, i) => (
              <View key={i} style={styles.statMiniCard}>
                <View style={[styles.statMiniIconWrap, { backgroundColor: stat.bg }]}>
                  <Ionicons name={stat.icon} size={16} color={stat.color} />
                </View>
                <Text style={styles.statMiniValue}>{stat.value}</Text>
                <Text style={styles.statMiniLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Next Appointment ── */}
        {nextAppointment && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Next Up</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>Live</Text>
              </View>
            </View>

            <View style={styles.nextCard}>
              {/* Type stripe */}
              <LinearGradient
                colors={nextAppointment.type === 'video' ? THEME.gradient.secondary : THEME.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.nextCardStripe}
              />

              <View style={styles.nextCardContent}>
                {/* Header row */}
                <View style={styles.nextCardHeaderRow}>
                  <View style={[
                    styles.nextTypeBadge,
                    { backgroundColor: nextAppointment.type === 'video' ? '#EAF3FF' : THEME.primaryLight },
                  ]}>
                    <Ionicons
                      name={nextAppointment.type === 'video' ? 'videocam-outline' : 'business-outline'}
                      size={13}
                      color={nextAppointment.type === 'video' ? THEME.accent : THEME.primary}
                    />
                    <Text style={[styles.nextTypeBadgeText, {
                      color: nextAppointment.type === 'video' ? THEME.accent : THEME.primary,
                    }]}>
                      {nextAppointment.type === 'video' ? 'Video Call' : 'In-Clinic'}
                    </Text>
                  </View>
                  <View style={styles.nextTimeChip}>
                    <Ionicons name="time-outline" size={13} color={THEME.primary} />
                    <Text style={styles.nextTimeText}>
                      {formatTime(nextAppointment.timeSlot.start)}
                    </Text>
                  </View>
                </View>

                {/* Patient info */}
                <View style={styles.nextPatientRow}>
                  <LinearGradient colors={THEME.gradient.primary} style={styles.nextPatientAvatar}>
                    <MaterialCommunityIcons name="account" size={22} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.nextPatientInfo}>
                    <Text style={styles.nextPatientName}>Patient #{nextAppointment.patientId.slice(-3)}</Text>
                    {nextAppointment.symptoms ? (
                      <Text style={styles.nextPatientSymptoms} numberOfLines={1}>
                        {nextAppointment.symptoms}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.nextDurationBadge}>
                    <Text style={styles.nextDurationText}>30 min</Text>
                  </View>
                </View>

                {/* CTA */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate(DoctorRouteNames.Consultation, { appointmentId: nextAppointment.appointmentId })}
                >
                  <LinearGradient
                    colors={nextAppointment.type === 'video' ? THEME.gradient.secondary : THEME.gradient.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.startBtn}
                  >
                    <Ionicons
                      name={nextAppointment.type === 'video' ? 'videocam' : 'enter-outline'}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.startBtnText}>Start Consultation</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {[
              { icon: 'calendar', label: 'Schedule', color: THEME.primary, bg: THEME.primaryLight, route: DoctorRouteNames.DoctorSchedule },
              { icon: 'cash-multiple', label: 'Earnings', color: THEME.success, bg: '#ECFDF5', isMaterial: true, route: DoctorRouteNames.DoctorEarnings },
              { icon: 'settings-outline', label: 'Settings', color: '#64748B', bg: '#F1F5F9', route: DoctorRouteNames.DoctorSettings },
            ].map((action, i) => (
              <TouchableOpacity key={i} style={styles.quickActionCard} activeOpacity={0.7} onPress={() => navigation.navigate(action.route)}>
                <View style={[styles.quickActionIconWrap, { backgroundColor: action.bg }]}>
                  {action.isMaterial ? (
                    <MaterialCommunityIcons name={action.icon as any} size={22} color={action.color} />
                  ) : (
                    <Ionicons name={action.icon as any} size={22} color={action.color} />
                  )}
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Today's Schedule ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <View style={styles.scheduleCountBadge}>
              <Text style={styles.scheduleCountText}>{upcomingAppointments.length}</Text>
            </View>
          </View>

          {upcomingAppointments.length === 0 ? (
            <View style={styles.emptyCard}>
              <LinearGradient colors={['#F0F7FF', '#D6E8FF']} style={styles.emptyIconWrap}>
                <Ionicons name="calendar-outline" size={32} color={THEME.primary} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No appointments today</Text>
              <Text style={styles.emptySubtitle}>Your schedule is clear for today</Text>
            </View>
          ) : (
            <View style={styles.scheduleList}>
              {upcomingAppointments.map((apt: Appointment) => {
                const isNext = apt.appointmentId === nextAppointment?.appointmentId;
                const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
                  confirmed: { bg: '#DCFCE7', text: '#16A34A', dot: '#10B981' },
                  pending:   { bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B' },
                  completed: { bg: '#F0F7FF', text: '#1857C0', dot: '#2A7FFF' },
                  cancelled: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
                };
                const sc = statusColors[apt.status] ?? statusColors.pending;

                return (
                  <TouchableOpacity
                    key={apt.appointmentId}
                    style={[styles.scheduleCard, isNext && styles.scheduleCardHighlight]}
                    activeOpacity={0.75}
                    onPress={() => navigation.navigate(DoctorRouteNames.Consultation, { appointmentId: apt.appointmentId })}
                  >
                    {isNext && (
                      <LinearGradient
                        colors={THEME.gradient.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.scheduleHighlightStripe}
                      />
                    )}

                    {/* Time */}
                    <View style={styles.scheduleTimeBlock}>
                      <Text style={[styles.scheduleTimeStart, isNext && { color: THEME.primary }]}>
                        {formatTime(apt.timeSlot.start)}
                      </Text>
                      <Text style={styles.scheduleTimeEnd}>{formatTime(apt.timeSlot.end)}</Text>
                    </View>

                    <View style={styles.scheduleVerticalDivider} />

                    {/* Content */}
                    <View style={styles.scheduleContent}>
                      <View style={styles.scheduleTopRow}>
                        <Text style={styles.schedulePatientName} numberOfLines={1}>
                          Patient #{apt.patientId.slice(-3)}
                        </Text>
                        <View style={[styles.scheduleStatusBadge, { backgroundColor: sc.bg }]}>
                          <View style={[styles.scheduleStatusDot, { backgroundColor: sc.dot }]} />
                          <Text style={[styles.scheduleStatusText, { color: sc.text }]}>
                            {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.scheduleBottomRow}>
                        <View style={[
                          styles.scheduleTypeChip,
                          { backgroundColor: apt.type === 'video' ? '#EAF3FF' : THEME.primaryLight },
                        ]}>
                          <Ionicons
                            name={apt.type === 'video' ? 'videocam-outline' : 'business-outline'}
                            size={11}
                            color={apt.type === 'video' ? THEME.accent : THEME.primary}
                          />
                          <Text style={[styles.scheduleTypeText, {
                            color: apt.type === 'video' ? THEME.accent : THEME.primary,
                          }]}>
                            {apt.type === 'video' ? 'Video' : 'Clinic'}
                          </Text>
                        </View>
                        {apt.symptoms ? (
                          <Text style={styles.scheduleSymptomsText} numberOfLines={1}>
                            {apt.symptoms}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Earnings Summary ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings Summary</Text>
          <View style={styles.earningsCard}>
            <View style={styles.earningsRow}>
              <View style={styles.earningsItem}>
                <View style={[styles.earningsDotWrap, { backgroundColor: THEME.primaryLight }]}>
                  <View style={[styles.earningsDotInner, { backgroundColor: THEME.primary }]} />
                </View>
                <Text style={styles.earningsItemLabel}>Today</Text>
                <Text style={styles.earningsItemValue}>{formatCurrency(earnings.today, earnings.currency)}</Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={styles.earningsItem}>
                <View style={[styles.earningsDotWrap, { backgroundColor: '#ECFDF5' }]}>
                  <View style={[styles.earningsDotInner, { backgroundColor: THEME.success }]} />
                </View>
                <Text style={styles.earningsItemLabel}>This Week</Text>
                <Text style={styles.earningsItemValue}>{formatCurrency(earnings.thisWeek, earnings.currency)}</Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={styles.earningsItem}>
                <View style={[styles.earningsDotWrap, { backgroundColor: '#FFFBEB' }]}>
                  <View style={[styles.earningsDotInner, { backgroundColor: THEME.warning }]} />
                </View>
                <Text style={styles.earningsItemLabel}>This Month</Text>
                <Text style={[styles.earningsItemValue, { fontSize: 14 }]}>{formatCurrency(earnings.thisMonth, earnings.currency)}</Text>
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.85}>
              <LinearGradient
                colors={THEME.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.earningsCTA}
              >
                <Text style={styles.earningsCTAText}>View Full Earnings</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
};

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.pageBg,
  },

  // Floating header
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: STATUS_BAR_HEIGHT,
    height: 58 + STATUS_BAR_HEIGHT,
    backgroundColor: '#FFFFFF',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  floatingHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.textDark,
    letterSpacing: -0.3,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  // Loading
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    backgroundColor: THEME.pageBg,
  },
  loadingIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: THEME.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textMedium,
  },

  // Error
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 10,
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
    color: THEME.textDark,
  },
  errorSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.textLight,
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

  // Header
  headerSection: {
    paddingTop: STATUS_BAR_HEIGHT + 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    ...Platform.select({
      ios: { shadowColor: THEME.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  welcomeLeft: {
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textMedium,
    marginBottom: 4,
  },
  doctorNameText: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.textDark,
    letterSpacing: -0.6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.error,
    zIndex: 1,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statMiniCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8F0FE',
    ...Platform.select({
      ios: { shadowColor: THEME.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  statMiniIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statMiniValue: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textDark,
    letterSpacing: -0.3,
  },
  statMiniLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.textMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
    color: THEME.textDark,
    letterSpacing: -0.3,
    flex: 1,
    marginBottom: 14,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.error,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.error,
    letterSpacing: 0.3,
  },
  scheduleCountBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  scheduleCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.primary,
  },

  // Next appointment card
  nextCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E8F0FE',
    ...Platform.select({
      ios: { shadowColor: THEME.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 16 },
      android: { elevation: 5 },
    }),
  },
  nextCardStripe: {
    width: 5,
  },
  nextCardContent: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  nextCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  nextTypeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  nextTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.accentLight,
  },
  nextTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
  },
  nextPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextPatientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextPatientInfo: {
    flex: 1,
  },
  nextPatientName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textDark,
  },
  nextPatientSymptoms: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.textLight,
    marginTop: 2,
  },
  nextDurationBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  nextDurationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // Quick actions
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: THEME.cardBg,
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  quickActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textDark,
  },

  // Schedule
  scheduleList: {
    gap: 8,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.cardBg,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  scheduleCardHighlight: {
    borderColor: THEME.accentLight,
    backgroundColor: THEME.primaryLight,
  },
  scheduleHighlightStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  scheduleTimeBlock: {
    alignItems: 'center',
    width: 58,
    paddingLeft: 4,
  },
  scheduleTimeStart: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.textDark,
  },
  scheduleTimeEnd: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.textLight,
    marginTop: 2,
  },
  scheduleVerticalDivider: {
    width: 1.5,
    height: 32,
    backgroundColor: '#E2E8F0',
    borderRadius: 1,
  },
  scheduleContent: {
    flex: 1,
    gap: 5,
  },
  scheduleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  schedulePatientName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textDark,
    flex: 1,
  },
  scheduleStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  scheduleStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  scheduleStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scheduleBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scheduleTypeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scheduleSymptomsText: {
    fontSize: 11,
    fontWeight: '500',
    color: THEME.textLight,
    flex: 1,
  },

  // Empty
  emptyCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 10,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: THEME.border,
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
    color: THEME.textLight,
  },

  // Earnings
  earningsCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8F0FE',
    ...Platform.select({
      ios: { shadowColor: THEME.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14 },
      android: { elevation: 4 },
    }),
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  earningsDotWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  earningsDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  earningsItemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  earningsItemValue: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textDark,
    letterSpacing: -0.4,
  },
  earningsDivider: {
    width: 1,
    height: 40,
    backgroundColor: THEME.border,
  },
  earningsCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  earningsCTAText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // StatCard (unused component kept for reference)
  statCard: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden' as const,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  statGradient: {
    padding: 14,
    alignItems: 'center' as const,
    gap: 6,
    borderRadius: 10,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
});

export default DoctorHomeScreen;