import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  setNewDate,
  setNewSlot,
  fetchAvailableSlots,
  confirmReschedule,
  resetReschedule,
} from './rescheduleAppointmentSlice';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import type { TimeSlot } from '../../../../models/healthcare/types';

// ── Theme ────────────────────────────────────

const THEME = {
  primary: '#2A7FFF',
  primaryDark: '#1E6AE1',
  primaryLight: '#EAF3FF',
  accent: '#5A9FFF',
  success: '#10B981',
  warning: '#F59E0B',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'] as [string, string],
    soft: ['#EAF3FF', '#F0F7FF'] as [string, string],
  },
};

// ── Date Helpers ─────────────────────────────

const generateNext14Days = (): {
  date: string;
  dayLabel: string;
  dayNum: string;
  month: string;
}[] => {
  const days: { date: string; dayLabel: string; dayNum: string; month: string }[] = [];
  const today = new Date();
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTH_NAMES = [
    'Jan','Feb','Mar','Apr','May','Jun',
    'Jul','Aug','Sep','Oct','Nov','Dec',
  ];

  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      date: d.toISOString().split('T')[0],
      dayLabel: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_NAMES[d.getDay()],
      dayNum: String(d.getDate()),
      month: MONTH_NAMES[d.getMonth()],
    });
  }
  return days;
};

const groupSlotsByPeriod = (slots: TimeSlot[]) => {
  const morning: TimeSlot[] = [];
  const afternoon: TimeSlot[] = [];
  const evening: TimeSlot[] = [];

  for (const s of slots) {
    if (!s.isAvailable) continue;
    const hour = parseInt(s.startTime.split(':')[0], 10);
    if (hour < 12) morning.push(s);
    else if (hour < 17) afternoon.push(s);
    else evening.push(s);
  }
  return { morning, afternoon, evening };
};

const formatTime12 = (time24: string): string => {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${ampm}`;
};

// ── Component ────────────────────────────────

const RescheduleAppointmentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const cardAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
      Animated.stagger(
        90,
        cardAnims.map((a) =>
          Animated.spring(a, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true })
        )
      ),
    ]).start();
  }, []);

  const { appointment, newDate, newSlot, availableSlots, loading } = useAppSelector(
    (state) => state.rescheduleAppointment,
  );

  const dates = useMemo(() => generateNext14Days(), []);
  const slotGroups = useMemo(() => groupSlotsByPeriod(availableSlots), [availableSlots]);

  const handleBack = () => {
    dispatch(resetReschedule());
    navigation.goBack();
  };

  const handleDateSelect = useCallback(
    (date: string) => {
      dispatch(setNewDate(date));
      if (appointment?.doctorId) {
        dispatch(fetchAvailableSlots({ doctorId: appointment.doctorId, date }));
      }
    },
    [dispatch, appointment],
  );

  const handleSlotSelect = useCallback(
    (slot: TimeSlot) => dispatch(setNewSlot(slot)),
    [dispatch],
  );

  const handleConfirm = useCallback(async () => {
    if (!appointment || !newDate || !newSlot) return;
    await dispatch(confirmReschedule());
    navigation.goBack();
  }, [dispatch, appointment, newDate, newSlot, navigation]);

  // ── Slot Chip ────────────────────────────────

  const SlotChip = ({ slot }: { slot: TimeSlot }) => {
    const selected = newSlot?.slotId === slot.slotId;
    return (
      <TouchableOpacity
        style={[styles.slotChip, selected && styles.slotChipSelected]}
        onPress={() => handleSlotSelect(slot)}
        activeOpacity={0.7}
      >
        {selected && (
          <LinearGradient
            colors={THEME.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Text style={[styles.slotChipText, selected && styles.slotChipTextSelected]}>
          {formatTime12(slot.startTime)}
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Period Section ────────────────────────────

  const SlotPeriodSection = ({
    title,
    icon,
    slots,
    color,
  }: {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    slots: TimeSlot[];
    color: string;
  }) => {
    if (slots.length === 0) return null;
    return (
      <View style={styles.periodSection}>
        <View style={styles.periodHeader}>
          <View style={[styles.periodIconBadge, { backgroundColor: `${color}18` }]}>
            <Ionicons name={icon} size={14} color={color} />
          </View>
          <Text style={styles.periodTitle}>{title}</Text>
          <View style={[styles.slotCountBadge, { backgroundColor: `${color}12` }]}>
            <Text style={[styles.slotCountText, { color }]}>{slots.length} slots</Text>
          </View>
        </View>
        <View style={styles.slotGrid}>
          {slots.map((s) => (
            <SlotChip key={s.slotId} slot={s} />
          ))}
        </View>
      </View>
    );
  };

  // ── Guard ─────────────────────────────────────

  if (!appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reschedule</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <LinearGradient colors={['#EAF3FF', '#B8D4FF']} style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={40} color={THEME.primary} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No appointment selected</Text>
          <Text style={styles.emptySubtitle}>Please go back and select an appointment to reschedule.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isVideo = appointment.type === 'video';
  const hasSlots =
    slotGroups.morning.length + slotGroups.afternoon.length + slotGroups.evening.length > 0;
  const canConfirm = !!newDate && !!newSlot && !loading;

  // ── Render ────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* ── Gradient Header ── */}
      <LinearGradient colors={THEME.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Reschedule</Text>
          <Text style={styles.headerSubtitle}>Pick a new date & time</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >

        {/* ── Current Appointment Card ── */}
        <Animated.View
          style={{
            opacity: cardAnims[0],
            transform: [{ translateY: cardAnims[0].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
          }}
        >
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <View style={styles.cardLabelDot} />
              <Text style={styles.cardLabel}>Current Appointment</Text>
            </View>

            <LinearGradient colors={['#F8FBFF', '#F1F5F9']} style={styles.currentAppointmentBlock}>
              <View style={[styles.consultTypeIcon, isVideo ? styles.consultTypeIconVideo : styles.consultTypeIconClinic]}>
                <LinearGradient
                  colors={isVideo ? ['#5A9FFF', '#1857C0'] : THEME.gradient.primary}
                  style={styles.consultTypeIconGradient}
                >
                  <Ionicons name={isVideo ? 'videocam' : 'medkit'} size={18} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.currentInfo}>
                <Text style={styles.currentType}>
                  {isVideo ? 'Video Consultation' : 'In-Clinic Visit'}
                </Text>
                <Text style={styles.currentMeta}>
                  📅 {appointment.date}
                </Text>
                <Text style={styles.currentMeta}>
                  🕐 {appointment.timeSlot.start} – {appointment.timeSlot.end}
                </Text>
              </View>
              <View style={[styles.statusBadge, styles.statusBadgeConfirmed]}>
                <Text style={styles.statusBadgeText}>Confirmed</Text>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* ── Date Picker ── */}
        <Animated.View
          style={{
            opacity: cardAnims[1],
            transform: [{ translateY: cardAnims[1].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
          }}
        >
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <View style={styles.cardLabelDot} />
              <Text style={styles.cardLabel}>Select New Date</Text>
            </View>

            <FlatList
              horizontal
              data={dates}
              keyExtractor={(item) => item.date}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateList}
              renderItem={({ item }) => {
                const selected = newDate === item.date;
                return (
                  <TouchableOpacity
                    style={[styles.dateCard, selected && styles.dateCardSelected]}
                    onPress={() => handleDateSelect(item.date)}
                    activeOpacity={0.7}
                  >
                    {selected && (
                      <LinearGradient
                        colors={THEME.gradient.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                      />
                    )}
                    <Text style={[styles.dateDayLabel, selected && styles.dateDayLabelSelected]}>
                      {item.dayLabel}
                    </Text>
                    <Text style={[styles.dateDayNum, selected && styles.dateDayNumSelected]}>
                      {item.dayNum}
                    </Text>
                    <Text style={[styles.dateMonth, selected && styles.dateMonthSelected]}>
                      {item.month}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Animated.View>

        {/* ── Available Slots ── */}
        {newDate && (
          <Animated.View
            style={{
              opacity: cardAnims[2],
              transform: [{ translateY: cardAnims[2].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
            }}
          >
            <View style={styles.card}>
              <View style={styles.cardLabelRow}>
                <View style={styles.cardLabelDot} />
                <Text style={styles.cardLabel}>Available Slots</Text>
                {hasSlots && !loading && (
                  <View style={styles.totalSlotsBadge}>
                    <Text style={styles.totalSlotsText}>
                      {slotGroups.morning.length + slotGroups.afternoon.length + slotGroups.evening.length} open
                    </Text>
                  </View>
                )}
              </View>

              {loading ? (
                <View style={styles.slotLoading}>
                  <ActivityIndicator size="small" color={THEME.primary} />
                  <Text style={styles.slotLoadingText}>Fetching available slots…</Text>
                </View>
              ) : hasSlots ? (
                <>
                  <SlotPeriodSection title="Morning" icon="sunny-outline" slots={slotGroups.morning} color="#F59E0B" />
                  <SlotPeriodSection title="Afternoon" icon="partly-sunny-outline" slots={slotGroups.afternoon} color="#2A7FFF" />
                  <SlotPeriodSection title="Evening" icon="moon-outline" slots={slotGroups.evening} color="#5A9FFF" />
                </>
              ) : (
                <View style={styles.noSlots}>
                  <View style={styles.noSlotsIcon}>
                    <Ionicons name="time-outline" size={28} color={THEME.primary} />
                  </View>
                  <Text style={styles.noSlotsTitle}>No slots available</Text>
                  <Text style={styles.noSlotsSubtitle}>Try a different date</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* ── Reschedule Summary ── */}
        {newSlot && (
          <Animated.View
            style={{
              opacity: cardAnims[3],
              transform: [{ translateY: cardAnims[3].interpolate({ inputRange: [0,1], outputRange: [16,0] }) }],
            }}
          >
            <LinearGradient colors={['#F0F7FF', '#EAF3FF']} style={styles.summaryCard}>
              <View style={styles.summaryIconWrap}>
                <LinearGradient colors={THEME.gradient.primary} style={styles.summaryIconGradient}>
                  <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>New appointment</Text>
                <Text style={styles.summaryDate}>{newDate}</Text>
                <Text style={styles.summaryTime}>
                  {formatTime12(newSlot.startTime)} – {formatTime12(newSlot.endTime)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => dispatch(setNewSlot(null))}
                style={styles.summaryClear}
              >
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* ── Footer Confirm Button ── */}
      <View style={styles.footer}>
        {newSlot && (
          <View style={styles.footerSummaryRow}>
            <Text style={styles.footerSummaryLabel}>Rescheduling to</Text>
            <Text style={styles.footerSummaryValue}>
              {newDate}  ·  {formatTime12(newSlot.startTime)}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm}
          activeOpacity={0.85}
        >
          {canConfirm ? (
            <LinearGradient
              colors={THEME.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmBtnGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmBtnText}>Confirm Reschedule</Text>
                </>
              )}
            </LinearGradient>
          ) : (
            <View style={styles.confirmBtnGradient}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#94A3B8" />
              <Text style={[styles.confirmBtnText, { color: '#94A3B8' }]}>
                Select a date & slot
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android'
      ? (StatusBar.currentHeight ?? 24) + 10
      : 14,
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
  headerSpacer: { width: 40 },

  // Scroll
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardLabelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  totalSlotsBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  totalSlotsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },

  // Current Appointment
  currentAppointmentBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  consultTypeIcon: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  consultTypeIconVideo: {},
  consultTypeIconClinic: {},
  consultTypeIconGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentInfo: {
    flex: 1,
    gap: 3,
  },
  currentType: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  currentMeta: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeConfirmed: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },

  // Date Picker
  dateList: {
    gap: 10,
    paddingRight: 4,
  },
  dateCard: {
    width: 68,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F8FBFF',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  dateCardSelected: {
    borderColor: 'transparent',
  },
  dateDayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dateDayLabelSelected: {
    color: 'rgba(255,255,255,0.85)',
  },
  dateDayNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateDayNumSelected: {
    color: '#FFFFFF',
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  dateMonthSelected: {
    color: 'rgba(255,255,255,0.8)',
  },

  // Slot Loading
  slotLoading: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  slotLoadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },

  // No Slots
  noSlots: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  noSlotsIcon: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  noSlotsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  noSlotsSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },

  // Period Sections
  periodSection: {
    marginBottom: 20,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  periodIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    flex: 1,
  },
  slotCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  slotCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Slot Chip
  slotChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    minWidth: 90,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  slotChipSelected: {
    borderColor: 'transparent',
  },
  slotChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  slotChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Summary
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#B8D4FF',
    gap: 14,
  },
  summaryIconWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  summaryIconGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  summaryDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
  },
  summaryTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A7FFF',
    marginTop: 1,
  },
  summaryClear: {
    padding: 4,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Footer
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  footerSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  footerSummaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
  footerSummaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
  },
  confirmBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  confirmBtnDisabled: {
    backgroundColor: '#F1F5F9',
  },
  confirmBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});

export default RescheduleAppointmentScreen;