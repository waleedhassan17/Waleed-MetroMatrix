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
import { darkShift, type DarkShift } from '../../../../constants/darkShift';
import { type ThemeMode } from '../../../../constants/theme';
import { useTheme } from '../../../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BackButton } from '../../../../components/ui';
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
  fetchAvailabilitySummary,
} from './slotSelectionSlice';
import type { ConsultationType } from './slotSelectionSlice';
import { clearSelectedClinic } from '../clinic-selection/clinicSelectionSlice';
import { HealthcareRouteNames } from '../../../../navigation-maps/Healthcare';
import type { TimeSlot, HealthcareStackParamList } from '../../../../models/healthcare/types';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import { useBottomBarPadding } from '../../../../hooks/useBottomBarPadding';
import { toLocalISODate } from '../../../../utils/date/localDate';

// ── Theme ─────────────────────────────────────

// A function of the mode. Light returns exactly the literals this block
// always held; dark is derived by role — see constants/darkShift.ts.
const makeTHEME = (mode: ThemeMode) => {
  const { hue, ground, n, grad } = darkShift(mode);
  return {
  primary: hue('#2A7FFF'),
  primaryDark: hue('#1E6AE1'),
  primaryLight: ground('#EAF3FF', '#2A7FFF'),
  accent: hue('#5A9FFF'),
  success: hue('#10B981'),
  gradient: {
    primary: grad(['#2A7FFF', '#1857C0']) as [string, string],
    video: grad(['#5A9FFF', '#1E6AE1']) as [string, string],
  },
  };
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
      date: toLocalISODate(d),
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
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const THEME = useMemo(() => makeTHEME(mode), [mode]);
  const styles = useMemo(() => makeStyles(THEME, sh), [THEME, sh]);
  const dispatch = useAppDispatch();
  const bottomBarPadding = useBottomBarPadding();
  const navigation = useNavigation<Nav>();
  const route = useRoute<SlotSelectionRoute>();
  const { doctorId } = route.params;

  const selectedDate = useAppSelector((s) => s.slotSelection.selectedDate);
  const selectedSlot = useAppSelector((s) => s.slotSelection.selectedSlot);
  const consultationType = useAppSelector((s) => s.slotSelection.consultationType);
  const loading = useAppSelector((s) => s.slotSelection.loading);
  const error = useAppSelector((s) => s.slotSelection.error);
  const { morning, afternoon, evening } = useAppSelector(selectSlotsByPeriod);
  const availabilityByDate = useAppSelector((st) => st.slotSelection.availabilityByDate);
  const nextAvailableDate = useAppSelector((st) => st.slotSelection.nextAvailableDate);

  // A date with no slots is rendered disabled rather than tappable-but-empty.
  // Unknown dates (summary still loading, or the request failed) read as
  // AVAILABLE on purpose: losing the hint is a small degradation, but hiding
  // real slots because a secondary request failed would be a serious one.
  const hasSummary = Object.keys(availabilityByDate).length > 0;
  const dateHasSlots = useCallback(
    (date: string) => (!hasSummary ? true : (availabilityByDate[date] ?? 0) > 0),
    [availabilityByDate, hasSummary]
  );

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

  // Which of the next 14 days have anything at all. One request for the whole
  // strip, so empty days can be greyed out instead of the patient tapping
  // through them one by one hunting for availability.
  useEffect(() => {
    const days = getNext14Days();
    dispatch(
      fetchAvailabilitySummary({
        doctorId,
        from: days[0].date,
        to: days[days.length - 1].date,
        consultationType,
      })
    );
  }, [dispatch, doctorId, consultationType]);

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

  // A clinic chosen on the previous screen fixes this as an in-clinic visit.
  const selectedClinic = useAppSelector((s) => s.clinicSelection?.selectedClinic);
  const lockedToClinic = !!selectedClinic;

  // Only offer the switch when this doctor actually consults over video, so we
  // never send someone to a slot list that can only ever be empty. Falls back to
  // offering it when the doctor is not in the store, which matches the
  // unlocked branch below — that has always shown both options unconditionally.
  const detailDoctor = useAppSelector((s) => s.doctorDetail?.doctor);
  const offersVideo =
    !detailDoctor || String(detailDoctor.doctorId) !== String(doctorId)
      ? true
      : (detailDoctor.videoConsultationFee ?? 0) > 0;

  useEffect(() => {
    if (lockedToClinic && consultationType !== 'in-clinic') {
      dispatch(setConsultationType('in-clinic'));
    }
  }, [lockedToClinic, consultationType, dispatch]);

  /**
   * Switch a clinic-locked booking to a video consultation.
   *
   * The clinic MUST be cleared here. `lockedToClinic` is derived from it, and
   * the effect above forces the type back to 'in-clinic' for as long as it is
   * set — so changing the type alone would be reverted on the very next render.
   */
  const handleSwitchToVideo = useCallback(() => {
    dispatch(clearSelectedClinic());
    dispatch(setConsultationType('video'));
  }, [dispatch]);

  const handleContinue = useCallback(() => {
    if (!selectedSlot) return;
    // This jumped straight to AppointmentConfirm, skipping the screen that
    // actually calls bookAppointmentApi — so "Booking Confirmed!" was shown
    // for an appointment that had never been created. Nothing reached the
    // server, which is why it never appeared under My Appointments and the
    // confirmation code fell back to the HC-XXXXXX placeholder.
    navigation.navigate(HealthcareRouteNames.BookingConfirmation as any, {
      doctorId,
    });
  }, [navigation, selectedSlot, doctorId]);

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
      const hasSlots = dateHasSlots(item.date);
      return (
        <TouchableOpacity
          style={[
            styles.dateChip,
            isSelected && styles.dateChipSelected,
            !hasSlots && !isSelected && styles.dateChipEmpty,
          ]}
          onPress={() => handleDatePress(item.date)}
          // Still tappable when empty — pressing shows the "no availability"
          // empty state, which is clearer than a chip that ignores taps.
          activeOpacity={0.75}
          accessibilityLabel={
            hasSlots
              ? `${item.dayLabel} ${item.dateLabel}`
              : `${item.dayLabel} ${item.dateLabel}, no availability`
          }
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
          <Text
            style={[
              styles.dateChipDay,
              isSelected && styles.dateChipDaySelected,
              !hasSlots && !isSelected && styles.dateChipTextEmpty,
            ]}
          >
            {item.dayLabel}
          </Text>
          <Text
            style={[
              styles.dateChipDate,
              isSelected && styles.dateChipDateSelected,
              !hasSlots && !isSelected && styles.dateChipTextEmpty,
            ]}
          >
            {item.dateLabel}
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedDate, handleDatePress, dateHasSlots],
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
        <BackButton tone="onAccent" onPress={() => navigation.goBack()} />
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

        {/* ── Consultation Type ──
            Picking a clinic on the previous screen already decided this. The
            toggle still offered Video Call, which would have silently thrown
            that choice away and booked a different kind of appointment — so
            when a clinic is set, state it rather than offer it. */}
        {lockedToClinic ? (
          /*
            Two rows, not one.
            This was a single "Consultation Type" row showing the visit type AND
            the clinic name, with one "Change" link that called goBack() — so a
            control captioned "Consultation Type" actually took you back to
            clinic selection and changed the clinic. It also left no route to a
            video consultation once a clinic had been picked, even though the
            appointment type enum supports it.
            Each row now says what it is and its action changes exactly that.
          */
          <>
            <View style={styles.toggleWrapper}>
              <Text style={styles.toggleLabel}>Consultation Type</Text>
              <View style={styles.lockedTypeRow}>
                <View style={styles.lockedTypeIcon}>
                  <MaterialCommunityIcons name="hospital-building" size={18} color={THEME.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockedTypeTitle}>In-Clinic Visit</Text>
                  <Text style={styles.lockedTypeSub} numberOfLines={1}>
                    Visit the doctor in person
                  </Text>
                </View>
                {offersVideo && (
                  <TouchableOpacity
                    onPress={handleSwitchToVideo}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Switch to a video consultation"
                  >
                    <Text style={styles.lockedTypeChange}>Switch to Video</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.toggleWrapper}>
              <Text style={styles.toggleLabel}>Clinic</Text>
              <View style={styles.lockedTypeRow}>
                <View style={styles.lockedTypeIcon}>
                  <MaterialCommunityIcons name="map-marker" size={18} color={THEME.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockedTypeTitle} numberOfLines={1}>
                    {selectedClinic?.name}
                  </Text>
                  {!!selectedClinic?.address && (
                    <Text style={styles.lockedTypeSub} numberOfLines={1}>
                      {selectedClinic.address}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Change clinic"
                >
                  <Text style={styles.lockedTypeChange}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
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
        )}

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

        {/*
          The "jump to the next open day" shortcut.

          A doctor may have nothing for a week or more, and the strip only
          covers 14 days — so without this a patient scrolls past empty chip
          after empty chip with no idea whether anything exists at all. Shown
          only when the CURRENT selection is empty but something else is not,
          which is exactly the moment it helps.
        */}
        {nextAvailableDate && !dateHasSlots(selectedDate) && (
          <TouchableOpacity
            style={styles.nextAvailableBar}
            onPress={() => handleDatePress(nextAvailableDate)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={16} color="#1D4ED8" />
            <Text style={styles.nextAvailableText}>
              Next available{' '}
              {(() => {
                const d = new Date(`${nextAvailableDate}T00:00:00`);
                return d.toLocaleDateString('en-PK', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                });
              })()}
            </Text>
            <Text style={styles.nextAvailableAction}>View</Text>
          </TouchableOpacity>
        )}

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
                <LinearGradient colors={sh.grad(['#F0F7FF', '#D6E8FF'])} style={styles.emptyIconGradient}>
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
        <View style={[styles.bottomBar, { paddingBottom: bottomBarPadding }]}>
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

const makeStyles = (THEME: ReturnType<typeof makeTHEME>, sh: DarkShift) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: sh.n('#F8FBFF', 'bg'),
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
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: sh.n('#FFFFFF', 'inkInverse'),
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
  lockedTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: sh.n('#E3ECFB', 'disabled'),
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  lockedTypeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: sh.ground('#EAF3FF', '#2A7FFF'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTypeTitle: { fontSize: 15, fontWeight: '800', color: sh.n('#0F172A', 'ink') },
  lockedTypeSub: { fontSize: 12.5, color: sh.n('#64748B', 'inkMuted'), marginTop: 2 },
  lockedTypeChange: { fontSize: 13, fontWeight: '700', color: sh.hue('#2A7FFF') },
  toggleWrapper: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: sh.n('#64748B', 'inkMuted'),
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: sh.n('#E2E8F0', 'line'),
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
    color: sh.n('#94A3B8', 'inkFaint'),
  },
  toggleTextActive: {
    color: sh.n('#FFFFFF', 'inkInverse'),
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
    color: sh.n('#0F172A', 'ink'),
    letterSpacing: -0.3,
  },
  dateSectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: sh.n('#94A3B8', 'inkFaint'),
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
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderWidth: 1.5,
    borderColor: sh.n('#E2E8F0', 'line'),
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
  dateChipEmpty: {
    opacity: 0.4,
  },
  dateChipTextEmpty: {
    textDecorationLine: 'line-through',
  },
  nextAvailableBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: sh.ground('#EFF6FF', '#3B82F6'),
    borderWidth: 1,
    borderColor: sh.hue('#BFDBFE'),
  },
  nextAvailableText: {
    flex: 1,
    fontSize: 13,
    color: sh.hue('#1D4ED8'),
    fontWeight: '600',
  },
  nextAvailableAction: {
    fontSize: 13,
    color: sh.hue('#1D4ED8'),
    fontWeight: '800',
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
    color: sh.n('#94A3B8', 'inkFaint'),
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
    color: sh.n('#0F172A', 'ink'),
  },
  dateChipDateSelected: {
    color: sh.n('#FFFFFF', 'inkInverse'),
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
    color: sh.n('#0F172A', 'ink'),
    letterSpacing: -0.3,
  },
  totalSlotsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: sh.ground('#DCFCE7', '#10B981'),
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  totalSlotsText: {
    fontSize: 12,
    fontWeight: '700',
    color: sh.hue('#16A34A'),
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
    color: sh.hue('#374151'),
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
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderWidth: 1.5,
    borderColor: sh.n('#E2E8F0', 'line'),
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
    color: sh.hue('#374151'),
  },
  slotChipTextSelected: {
    color: sh.n('#FFFFFF', 'inkInverse'),
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
    backgroundColor: sh.ground('#F0F7FF', '#2A7FFF'),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: sh.hue('#374151'),
  },
  loadingSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: sh.n('#94A3B8', 'inkFaint'),
    marginTop: 4,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: sh.ground('#FEF2F2', '#EF4444'),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: sh.hue('#374151'),
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: sh.hue('#EF4444'),
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
    color: sh.n('#FFFFFF', 'inkInverse'),
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
    color: sh.hue('#374151'),
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: sh.n('#9CA3AF', 'inkFaint'),
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
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: sh.n('#F1F5F9', 'lineSoft'),
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
    color: sh.n('#94A3B8', 'inkFaint'),
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  selectedValue: {
    fontSize: 15,
    fontWeight: '800',
    color: sh.n('#0F172A', 'ink'),
    letterSpacing: -0.2,
  },
  selectedDate: {
    fontSize: 12,
    fontWeight: '500',
    color: sh.n('#64748B', 'inkMuted'),
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
    color: sh.n('#FFFFFF', 'inkInverse'),
    letterSpacing: -0.2,
  },
});