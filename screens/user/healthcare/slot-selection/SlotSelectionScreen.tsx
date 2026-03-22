import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
  fetchSlots,
  setSelectedDate,
  setSelectedSlot,
  setConsultationType,
  clearSelection,
  selectSlotsByPeriod,
} from './slotSelectionSlice';
import type { ConsultationType } from './slotSelectionSlice';
import type { TimeSlot, HealthcareStackParamList } from '../../../../models/healthcare/types';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';

// ── Theme ─────────────────────────────────────

const THEME = {
  primary: '#2A7FFF',
  primaryDark: '#1E6AE1',
  primaryLight: '#EAF3FF',
  accent: '#5A9FFF',
  success: '#10B981',
  gradient: {
    primary: ['#2A7FFF', '#1857C0'] as [string, string],
    video: ['#5A9FFF', '#1E6AE1'] as [string, string],
  },
};

// ── Route / Nav Types ─────────────────────────

type SlotSelectionRoute = RouteProp<HealthcareStackParamList, 'SlotSelection'>;
type Nav = NativeStackNavigationProp<HealthcareStackParamList>;

// ── Helpers ───────────────────────────────────

const getNext14Days = (): {
  date: string;
  dayLabel: string;
  dateLabel: string;
  isToday: boolean;
}[] => {
  const days: { date: string; dayLabel: string; dateLabel: string; isToday: boolean }[] = [];
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'Jan','Feb','Mar','Apr','May','Jun',
    'Jul','Aug','Sep','Oct','Nov','Dec',
  ];

  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      date: d.toISOString().split('T')[0],
      dayLabel: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[d.getDay()],
      dateLabel: `${d.getDate()} ${monthNames[d.getMonth()]}`,
      isToday: i === 0,
    });
  }
  return days;
};

const formatTime12 = (time24: string): string => {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${ampm}`;
};

// ── Component ─────────────────────────────────

const SlotSelectionScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const route = useRoute<SlotSelectionRoute>();
  const { doctorId } = route.params;

  const selectedDate = useAppSelector((s) => s.slotSelection.selectedDate);
  const selectedSlot = useAppSelector((s) => s.slotSelection.selectedSlot);
  const consultationType = useAppSelector((s) => s.slotSelection.consultationType);
  const loading = useAppSelector((s) => s.slotSelection.loading);
  const error = useAppSelector((s) => s.slotSelection.error);
  const { morning, afternoon, evening } = useAppSelector(selectSlotsByPeriod);

  const days = useMemo(getNext14Days, []);
  const dateFlatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const toggleAnim = useRef(new Animated.Value(consultationType === 'video' ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    dispatch(fetchSlots({ doctorId, date: selectedDate, consultationType }));
  }, [dispatch, doctorId, selectedDate, consultationType]);

  useEffect(() => {
    return () => { dispatch(clearSelection()); };
  }, [dispatch]);

  // Animate toggle indicator
  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: consultationType === 'video' ? 1 : 0,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [consultationType]);

  // ── Handlers ──────────────────────────────────

  const handleDatePress = useCallback(
    (date: string) => dispatch(setSelectedDate(date)),
    [dispatch],
  );

  const handleSlotPress = useCallback(
    (slot: TimeSlot) => dispatch(setSelectedSlot(slot)),
    [dispatch],
  );

  const handleTypeToggle = useCallback(
    (type: ConsultationType) => dispatch(setConsultationType(type)),
    [dispatch],
  );

  const handleContinue = useCallback(() => {
    if (!selectedSlot) return;
    navigation.navigate('AppointmentConfirm' as any, {
      appointmentId: selectedSlot.slotId,
    });
  }, [navigation, selectedSlot]);

  // ── Slot Chip ─────────────────────────────────

  const renderSlotChip = useCallback(
    (slot: TimeSlot) => {
      const isSelected = selectedSlot?.slotId === slot.slotId;
      return (
        <TouchableOpacity
          key={slot.slotId}
          style={[styles.slotChip, isSelected && styles.slotChipSelected]}
          onPress={() => handleSlotPress(slot)}
          activeOpacity={0.7}
        >
          {isSelected && (
            <LinearGradient
              colors={THEME.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
            />
          )}
          <Text style={[styles.slotChipText, isSelected && styles.slotChipTextSelected]}>
            {formatTime12(slot.startTime)}
          </Text>
          {isSelected && (
            <Ionicons name="checkmark" size={13} color="#FFFFFF" style={{ marginLeft: 4 }} />
          )}
        </TouchableOpacity>
      );
    },
    [selectedSlot, handleSlotPress],
  );

  // ── Period Section ────────────────────────────

  const renderSection = (
    title: string,
    icon: keyof typeof Ionicons.glyphMap,
    slots: TimeSlot[],
    accentColor: string,
  ) => {
    if (slots.length === 0) return null;
    return (
      <View style={styles.section} key={title}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconBadge, { backgroundColor: `${accentColor}16` }]}>
            <Ionicons name={icon} size={15} color={accentColor} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={[styles.sectionCountBadge, { backgroundColor: `${accentColor}12` }]}>
            <Text style={[styles.sectionCount, { color: accentColor }]}>{slots.length}</Text>
          </View>
        </View>
        <View style={styles.slotsGrid}>{slots.map(renderSlotChip)}</View>
      </View>
    );
  };

  // ── Date Item ─────────────────────────────────

  const renderDateItem = useCallback(
    ({ item }: { item: ReturnType<typeof getNext14Days>[0] }) => {
      const isSelected = item.date === selectedDate;
      return (
        <TouchableOpacity
          style={[styles.dateChip, isSelected && styles.dateChipSelected]}
          onPress={() => handleDatePress(item.date)}
          activeOpacity={0.75}
        >
          {isSelected && (
            <LinearGradient
              colors={THEME.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
          )}
          {item.isToday && !isSelected && (
            <View style={styles.todayDot} />
          )}
          <Text style={[styles.dateChipDay, isSelected && styles.dateChipDaySelected]}>
            {item.dayLabel}
          </Text>
          <Text style={[styles.dateChipDate, isSelected && styles.dateChipDateSelected]}>
            {item.dateLabel}
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedDate, handleDatePress],
  );

  const totalSlots = morning.length + afternoon.length + evening.length;

  // ── Render ────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={THEME.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <Text style={styles.headerSubtitle}>Choose your preferred slot</Text>
        </View>
        <View style={styles.backBtn} />
      </LinearGradient>

      <Animated.ScrollView
        style={[styles.body, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.bodyContent}
      >

        {/* ── Consultation Type Toggle ── */}
        <View style={styles.toggleWrapper}>
          <Text style={styles.toggleLabel}>Consultation Type</Text>
          <View style={styles.toggleContainer}>
            {/* Animated sliding pill */}
            <Animated.View
              style={[
                styles.togglePill,
                {
                  left: toggleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['2%', '50%'],
                  }),
                },
              ]}
            >
              <LinearGradient
                colors={consultationType === 'video' ? THEME.gradient.video : THEME.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
              />
            </Animated.View>

            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => handleTypeToggle('in-clinic')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="business-outline"
                size={17}
                color={consultationType === 'in-clinic' ? '#FFFFFF' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.toggleText,
                  consultationType === 'in-clinic' && styles.toggleTextActive,
                ]}
              >
                In-Clinic
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => handleTypeToggle('video')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="videocam-outline"
                size={17}
                color={consultationType === 'video' ? '#FFFFFF' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.toggleText,
                  consultationType === 'video' && styles.toggleTextActive,
                ]}
              >
                Video Call
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Date Picker ── */}
        <View style={styles.dateSection}>
          <View style={styles.dateSectionHeader}>
            <Text style={styles.dateSectionTitle}>Select Date</Text>
            <Text style={styles.dateSectionSubtitle}>Next 14 days</Text>
          </View>
          <FlatList
            ref={dateFlatListRef}
            data={days}
            keyExtractor={(item) => item.date}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateList}
            renderItem={renderDateItem}
          />
        </View>

        {/* ── Slots Content ── */}
        <View style={styles.slotsSection}>
          {/* Section Header */}
          <View style={styles.slotsSectionHeader}>
            <Text style={styles.slotsSectionTitle}>Available Slots</Text>
            {!loading && totalSlots > 0 && (
              <View style={styles.totalSlotsBadge}>
                <MaterialCommunityIcons name="clock-outline" size={12} color="#16A34A" />
                <Text style={styles.totalSlotsText}>{totalSlots} open</Text>
              </View>
            )}
          </View>

          {loading ? (
            <View style={styles.centered}>
              <View style={styles.loadingSpinnerWrap}>
                <ActivityIndicator size="large" color={THEME.primary} />
              </View>
              <Text style={styles.loadingText}>Finding available slots…</Text>
              <Text style={styles.loadingSubtext}>This won't take long</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <View style={styles.errorIconWrap}>
                <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
              </View>
              <Text style={styles.errorTitle}>Something went wrong</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() =>
                  dispatch(fetchSlots({ doctorId, date: selectedDate, consultationType }))
                }
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={THEME.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.retryBtnGradient}
                >
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.retryText}>Try Again</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : totalSlots === 0 ? (
            <View style={styles.centered}>
              <View style={styles.emptyIconWrap}>
                <LinearGradient colors={['#F0F7FF', '#D6E8FF']} style={styles.emptyIconGradient}>
                  <Ionicons name="calendar-outline" size={36} color={THEME.primary} />
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>No Slots Available</Text>
              <Text style={styles.emptySubtitle}>
                Try selecting a different date or consultation type
              </Text>
            </View>
          ) : (
            <View style={styles.slotsContainer}>
              {renderSection('Morning', 'sunny-outline', morning, '#F59E0B')}
              {renderSection('Afternoon', 'partly-sunny-outline', afternoon, '#2A7FFF')}
              {renderSection('Evening', 'moon-outline', evening, '#5A9FFF')}
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* ── Bottom Bar ── */}
      {selectedSlot ? (
        <View style={styles.bottomBar}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedLabel}>Selected Slot</Text>
            <Text style={styles.selectedValue}>
              {formatTime12(selectedSlot.startTime)} – {formatTime12(selectedSlot.endTime)}
            </Text>
            <Text style={styles.selectedDate}>{selectedDate}</Text>
          </View>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={THEME.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtnGradient}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

export default SlotSelectionScreen;

// ── Styles ────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
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
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
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

  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 40,
  },

  // Toggle
  toggleWrapper: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
    height: 52,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  togglePill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 0,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    gap: 6,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },

  // Date Section
  dateSection: {
    marginTop: 20,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  dateSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  dateSectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  dateList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  dateChip: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minWidth: 72,
    position: 'relative',
    overflow: 'hidden',
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
  dateChipSelected: {
    borderColor: 'transparent',
  },
  todayDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.success,
  },
  dateChipDay: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  dateChipDaySelected: {
    color: 'rgba(255,255,255,0.85)',
  },
  dateChipDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateChipDateSelected: {
    color: '#FFFFFF',
  },

  // Slots Section
  slotsSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  slotsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  slotsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  totalSlotsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  totalSlotsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },

  // Section (period)
  slotsContainer: {
    gap: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    flex: 1,
  },
  sectionCountBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '800',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Slot Chips
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    minWidth: 90,
    justifyContent: 'center',
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
    ...Platform.select({
      ios: {
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
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

  // States
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  loadingSpinnerWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  loadingSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 4,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  retryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyIconWrap: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  selectedInfo: {
    flex: 1,
  },
  selectedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  selectedValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  selectedDate: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  continueBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  continueBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});