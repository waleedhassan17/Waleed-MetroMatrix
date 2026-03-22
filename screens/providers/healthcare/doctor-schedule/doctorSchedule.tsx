import React, { useEffect, useMemo, useCallback, useRef } from 'react';
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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import {
  fetchSchedule,
  setSelectedDate,
  setViewMode,
  resetDoctorSchedule,
  ViewMode,
} from './doctorScheduleSlice';
import { Appointment } from '../../../../models/healthcare/types';

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
    secondary: ['#5A9FFF', '#1E6AE1'] as [string, string],
  },
};

// ── Helpers ───────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const isSameDay = (d1: string, d2: string) => d1 === d2;

const getWeekDates = (centerDate: string): string[] => {
  const d = new Date(centerDate + 'T12:00:00Z');
  const dayOfWeek = d.getUTCDay();
  const startOfWeek = new Date(d);
  startOfWeek.setUTCDate(d.getUTCDate() - dayOfWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setUTCDate(startOfWeek.getUTCDate() + i);
    return day.toISOString().split('T')[0];
  });
};

const formatDateHeader = (dateStr: string): string => {
  const d = new Date(dateStr + 'T12:00:00Z');
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  if (dateStr === todayStr) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';
  return `${DAY_NAMES[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
};

const formatTime12 = (time24: string): string => {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const STATUS_CONFIG: Record<Appointment['status'], { bg: string; text: string; dot: string }> = {
  confirmed: { bg: '#DCFCE7', text: '#16A34A', dot: '#10B981' },
  pending:   { bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B' },
  completed: { bg: '#F1F5F9', text: '#64748B', dot: '#94A3B8' },
  cancelled: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
  'no-show': { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
};

const PATIENT_NAMES: Record<string, string> = {
  'p-001': 'Imran Khan',
  'p-002': 'Sara Ahmed',
  'p-003': 'Usman Malik',
  'p-004': 'Fatima Noor',
  'p-005': 'Ali Hassan',
  'p-006': 'Ayesha Khan',
  'p-007': 'Kamran Shah',
  'p-008': 'Bilal Iqbal',
  'p-009': 'Zainab Raza',
  'p-010': 'Ahmed Rauf',
};

// ── Week Calendar Strip ───────────────────────

const WeekCalendarStrip: React.FC<{
  weekDates: string[];
  selectedDate: string;
  appointmentsByDate: Record<string, Appointment[]>;
  onSelectDate: (date: string) => void;
}> = ({ weekDates, selectedDate, appointmentsByDate, onSelectDate }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <View style={styles.calendarStrip}>
      {weekDates.map((dateStr) => {
        const d = new Date(dateStr + 'T12:00:00Z');
        const isSelected = isSameDay(dateStr, selectedDate);
        const isToday = isSameDay(dateStr, todayStr);
        const apts = appointmentsByDate[dateStr] || [];
        const hasInClinic = apts.some((a) => a.type === 'in-clinic');
        const hasVideo = apts.some((a) => a.type === 'video');

        return (
          <TouchableOpacity
            key={dateStr}
            style={[styles.calendarDay, isSelected && styles.calendarDaySelected]}
            onPress={() => onSelectDate(dateStr)}
            activeOpacity={0.75}
          >
            {isSelected && (
              <LinearGradient
                colors={THEME.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
              />
            )}

            <Text style={[styles.calendarDayName, isSelected && styles.calendarDayNameSelected]}>
              {DAY_NAMES[d.getUTCDay()]}
            </Text>
            <Text
              style={[
                styles.calendarDayNumber,
                isSelected && styles.calendarDayNumberSelected,
                isToday && !isSelected && styles.calendarDayNumberToday,
              ]}
            >
              {d.getUTCDate()}
            </Text>

            {/* Appointment dots */}
            <View style={styles.dotRow}>
              {hasInClinic && (
                <View style={[styles.dot, { backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : THEME.primary }]} />
              )}
              {hasVideo && (
                <View style={[styles.dot, { backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : THEME.accent }]} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ── Appointment Card ──────────────────────────

const AppointmentCard: React.FC<{ appointment: Appointment; index: number }> = ({ appointment, index }) => {
  const isVideo = appointment.type === 'video';
  const sc = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.pending;
  const patientName = PATIENT_NAMES[appointment.patientId] || `Patient #${appointment.patientId.slice(-3)}`;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      delay: index * 55,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      }}
    >
      <TouchableOpacity style={styles.aptCard} activeOpacity={0.8}>
        {/* Left type stripe */}
        <LinearGradient
          colors={isVideo ? THEME.gradient.secondary : THEME.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.aptStripe}
        />

        <View style={styles.aptContent}>
          {/* Header row */}
          <View style={styles.aptHeaderRow}>
            <View style={styles.aptTimeRow}>
              <Ionicons name="time-outline" size={13} color="#64748B" />
              <Text style={styles.aptTimeText}>
                {formatTime12(appointment.timeSlot.start)} – {formatTime12(appointment.timeSlot.end)}
              </Text>
            </View>
            <View style={[styles.aptStatusBadge, { backgroundColor: sc.bg }]}>
              <View style={[styles.aptStatusDot, { backgroundColor: sc.dot }]} />
              <Text style={[styles.aptStatusText, { color: sc.text }]}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Patient row */}
          <View style={styles.aptPatientRow}>
            <LinearGradient
              colors={isVideo ? THEME.gradient.secondary : THEME.gradient.primary}
              style={styles.aptPatientAvatar}
            >
              <MaterialCommunityIcons name="account" size={16} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.aptPatientInfo}>
              <Text style={styles.aptPatientName}>{patientName}</Text>
              {appointment.symptoms ? (
                <Text style={styles.aptSymptoms} numberOfLines={1}>{appointment.symptoms}</Text>
              ) : null}
            </View>
          </View>

          {/* Footer chips */}
          <View style={styles.aptFooterRow}>
            <View style={[
              styles.aptTypeChip,
              { backgroundColor: isVideo ? '#EAF3FF' : THEME.primaryLight },
            ]}>
              <Ionicons
                name={isVideo ? 'videocam-outline' : 'business-outline'}
                size={11}
                color={isVideo ? THEME.accent : THEME.primary}
              />
              <Text style={[styles.aptTypeText, { color: isVideo ? THEME.accent : THEME.primary }]}>
                {isVideo ? 'Video Call' : 'In-Clinic'}
              </Text>
            </View>
            {appointment.clinicId && !isVideo && (
              <View style={styles.aptClinicChip}>
                <Ionicons name="location-outline" size={11} color="#94A3B8" />
                <Text style={styles.aptClinicText}>Clinic</Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginRight: 4 }} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Main Component ────────────────────────────

const DoctorScheduleScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const isInTab = route.params?.isTab === true;

  const { selectedDate, appointments, viewMode, loading, error } = useAppSelector(
    (state) => state.doctorSchedule,
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-10)).current;
  const hasAnimated = useRef(false);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    dispatch(fetchSchedule());
    return () => { dispatch(resetDoctorSchedule()); };
  }, [dispatch]);

  useEffect(() => {
    if (!loading && initialLoadDone.current && !hasAnimated.current) {
      hasAnimated.current = true;
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(headerSlide, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
      ]).start();
    }
    if (loading) {
      initialLoadDone.current = true;
    }
  }, [loading]);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const apt of appointments) {
      if (!map[apt.date]) map[apt.date] = [];
      map[apt.date].push(apt);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.timeSlot.start.localeCompare(b.timeSlot.start));
    }
    return map;
  }, [appointments]);

  const selectedDayAppointments = useMemo(
    () => appointmentsByDate[selectedDate] || [],
    [appointmentsByDate, selectedDate],
  );

  const handleDateSelect = useCallback((date: string) => dispatch(setSelectedDate(date)), [dispatch]);
  const handleViewModeToggle = useCallback((mode: ViewMode) => dispatch(setViewMode(mode)), [dispatch]);

  const navigateWeek = useCallback(
    (direction: -1 | 1) => {
      const d = new Date(selectedDate + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + direction * 7);
      dispatch(setSelectedDate(d.toISOString().split('T')[0]));
    },
    [dispatch, selectedDate],
  );

  const selectedMonth = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00Z');
    return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }, [selectedDate]);

  const weekViewData = useMemo(() => {
    if (viewMode !== 'week') return [];
    return weekDates
      .filter((date) => (appointmentsByDate[date]?.length ?? 0) > 0)
      .map((date) => ({ date, appointments: appointmentsByDate[date] }));
  }, [viewMode, weekDates, appointmentsByDate]);

  const totalDayCount = selectedDayAppointments.length;
  const inClinicCount = selectedDayAppointments.filter((a) => a.type === 'in-clinic').length;
  const videoCount = selectedDayAppointments.filter((a) => a.type === 'video').length;

  // ── Loading ───────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.headerGradient}>
          {isInTab ? <View style={styles.backButton} /> : (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>)}
          <Text style={styles.headerTitle}>Schedule</Text>
          <View style={styles.backButton} />
        </LinearGradient>
        <View style={styles.centered}>
          <View style={styles.loadingIconWrap}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
          <Text style={styles.loadingText}>Loading your schedule…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ─────────────────────────────────────

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.headerGradient}>
          {isInTab ? <View style={styles.backButton} /> : (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>)}
          <Text style={styles.headerTitle}>Schedule</Text>
          <View style={styles.backButton} />
        </LinearGradient>
        <View style={styles.centered}>
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={40} color={THEME.error} />
          </LinearGradient>
          <Text style={styles.errorTitle}>Failed to load schedule</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchSchedule())} activeOpacity={0.85}>
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* ── Gradient Header ── */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: headerSlide }] }}>
        <LinearGradient
          colors={THEME.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Nav row */}
          <View style={styles.headerNav}>
            {isInTab ? <View style={styles.backButton} /> : (
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>)}
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Schedule</Text>
              <Text style={styles.headerSubtitle}>{formatDateHeader(selectedDate)}</Text>
            </View>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => dispatch(setSelectedDate(new Date().toISOString().split('T')[0]))}
              activeOpacity={0.8}
            >
              <Ionicons name="today-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Month nav + view toggle */}
          <View style={styles.headerControls}>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => navigateWeek(-1)} style={styles.monthNavBtn} activeOpacity={0.75}>
                <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
              <Text style={styles.monthText}>{selectedMonth}</Text>
              <TouchableOpacity onPress={() => navigateWeek(1)} style={styles.monthNavBtn} activeOpacity={0.75}>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>

            {/* Day / Week toggle */}
            <View style={styles.viewToggle}>
              {(['day', 'week'] as ViewMode[]).map((mode) => {
                const isActive = viewMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.viewToggleBtn, isActive && styles.viewToggleBtnActive]}
                    onPress={() => handleViewModeToggle(mode)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.viewToggleText, isActive && styles.viewToggleTextActive]}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Calendar strip */}
          <WeekCalendarStrip
            weekDates={weekDates}
            selectedDate={selectedDate}
            appointmentsByDate={appointmentsByDate}
            onSelectDate={handleDateSelect}
          />
        </LinearGradient>
      </Animated.View>

      {/* ── Content ── */}
      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === 'day' ? (
          <>
            {/* Day summary stats */}
            <View style={styles.daySummaryStrip}>
              <View style={styles.daySummaryItem}>
                <LinearGradient colors={THEME.gradient.primary} style={styles.daySummaryIcon}>
                  <Ionicons name="calendar" size={14} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.daySummaryValue}>{totalDayCount}</Text>
                <Text style={styles.daySummaryLabel}>Total</Text>
              </View>
              <View style={styles.daySummaryDivider} />
              <View style={styles.daySummaryItem}>
                <LinearGradient colors={['#2A7FFF', '#1E6AE1']} style={styles.daySummaryIcon}>
                  <Ionicons name="business-outline" size={14} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.daySummaryValue}>{inClinicCount}</Text>
                <Text style={styles.daySummaryLabel}>In-Clinic</Text>
              </View>
              <View style={styles.daySummaryDivider} />
              <View style={styles.daySummaryItem}>
                <LinearGradient colors={THEME.gradient.secondary} style={styles.daySummaryIcon}>
                  <Ionicons name="videocam-outline" size={14} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.daySummaryValue}>{videoCount}</Text>
                <Text style={styles.daySummaryLabel}>Video</Text>
              </View>
            </View>

            {/* Day appointments */}
            {selectedDayAppointments.length === 0 ? (
              <View style={styles.emptyCard}>
                <LinearGradient colors={['#F0F7FF', '#D6E8FF']} style={styles.emptyIconWrap}>
                  <Ionicons name="calendar-outline" size={36} color={THEME.primary} />
                </LinearGradient>
                <Text style={styles.emptyTitle}>No Appointments</Text>
                <Text style={styles.emptySubtitle}>Your schedule is clear for this day</Text>
              </View>
            ) : (
              <View style={styles.aptList}>
                {selectedDayAppointments.map((apt, i) => (
                  <AppointmentCard key={apt.appointmentId} appointment={apt} index={i} />
                ))}
              </View>
            )}
          </>
        ) : (
          /* Week view */
          weekViewData.length === 0 ? (
            <View style={styles.emptyCard}>
              <LinearGradient colors={['#F0F7FF', '#D6E8FF']} style={styles.emptyIconWrap}>
                <Ionicons name="calendar-outline" size={36} color={THEME.primary} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No Appointments This Week</Text>
              <Text style={styles.emptySubtitle}>Your schedule is clear for this week</Text>
            </View>
          ) : (
            weekViewData.map(({ date, appointments: dayApts }) => (
              <View key={date} style={styles.weekSection}>
                <View style={styles.weekSectionHeader}>
                  <View style={styles.weekSectionDot} />
                  <Text style={styles.weekSectionTitle}>{formatDateHeader(date)}</Text>
                  <View style={styles.weekSectionCountBadge}>
                    <Text style={styles.weekSectionCountText}>{dayApts.length}</Text>
                  </View>
                </View>
                {dayApts.map((apt, i) => (
                  <AppointmentCard key={apt.appointmentId} appointment={apt} index={i} />
                ))}
              </View>
            ))
          )
        )}

        <View style={{ height: 60 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default DoctorScheduleScreen;

// ── Styles ─────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },

  // Loading / Error
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
    color: '#64748B',
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
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
    paddingBottom: 12,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  monthNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 3,
  },
  viewToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9,
  },
  viewToggleBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
  viewToggleTextActive: {
    color: THEME.primary,
  },

  // Calendar strip
  calendarStrip: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 6,
    gap: 4,
  },
  calendarDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    overflow: 'hidden',
    gap: 2,
  },
  calendarDaySelected: {},
  calendarDayName: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  calendarDayNameSelected: {
    color: '#FFFFFF',
  },
  calendarDayNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
  },
  calendarDayNumberSelected: {
    color: '#FFFFFF',
  },
  calendarDayNumberToday: {
    color: '#FDE68A',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    alignItems: 'center',
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // Scroll
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Day summary strip
  daySummaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  daySummaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  daySummaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  daySummaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  daySummaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  daySummaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#F1F5F9',
  },

  // Appointment list
  aptList: {
    gap: 10,
  },
  aptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  aptStripe: {
    width: 5,
    alignSelf: 'stretch',
  },
  aptContent: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  aptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aptTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  aptTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  aptStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aptStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  aptStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  aptPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aptPatientAvatar: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aptPatientInfo: {
    flex: 1,
  },
  aptPatientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  aptSymptoms: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  aptFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aptTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aptTypeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  aptClinicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aptClinicText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },

  // Week view
  weekSection: {
    marginBottom: 24,
  },
  weekSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  weekSectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
  },
  weekSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    letterSpacing: -0.2,
  },
  weekSectionCountBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekSectionCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primary,
  },

  // Empty
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 8,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
});