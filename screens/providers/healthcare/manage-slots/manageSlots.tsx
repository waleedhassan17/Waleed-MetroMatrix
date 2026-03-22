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
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../../constants/Colors';
import { Typography } from '../../../../constants/Fonts';
import {
  fetchSlots,
  saveSlots,
  setSelectedClinic,
  setSelectedDate,
  setSlotDuration,
  setMaxPatientsPerSlot,
  toggleSlot,
  clearSaveSuccess,
  resetManageSlots,
  SlotDuration,
} from './manageSlotsSlice';
import { TimeSlot } from '../../../../models/healthcare/types';

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
    warm: ['#F59E0B', '#EF4444'] as [string, string],
  },
};

const DURATION_OPTIONS: { label: string; value: SlotDuration; sub: string }[] = [
  { label: '15', value: 15, sub: 'min' },
  { label: '20', value: 20, sub: 'min' },
  { label: '30', value: 30, sub: 'min' },
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatTime12 = (time24: string): string => {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const getWeekDates = (centerDate: string): string[] => {
  const d = new Date(centerDate + 'T00:00:00');
  const dayOfWeek = d.getDay();
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - dayOfWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day.toISOString().split('T')[0];
  });
};

// ── Slot Grid Item ────────────────────────────

const SlotGridItem: React.FC<{
  slot: TimeSlot;
  onToggle: (id: string) => void;
}> = React.memo(({ slot, onToggle }) => {
  const isBooked = slot.bookedCount > 0;
  const isAvailable = slot.isAvailable;
  const pressAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (isBooked) return;
    Animated.sequence([
      Animated.timing(pressAnim, { toValue: 0.93, duration: 70, useNativeDriver: true }),
      Animated.spring(pressAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
    ]).start();
    onToggle(slot.slotId);
  };

  let bg = '#F8FBFF';
  let borderColor = '#E2E8F0';
  let timeColor = '#94A3B8';

  if (isBooked) {
    bg = '#EAF3FF';
    borderColor = THEME.accent;
    timeColor = THEME.accent;
  } else if (isAvailable) {
    bg = '#F0F7FF';
    borderColor = THEME.primary;
    timeColor = THEME.primary;
  }

  return (
    <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
      <TouchableOpacity
        style={[styles.slotCell, { backgroundColor: bg, borderColor }]}
        onPress={handlePress}
        disabled={isBooked}
        activeOpacity={isBooked ? 1 : 0.8}
      >
        <Text style={[styles.slotTime, { color: timeColor }]}>
          {formatTime12(slot.startTime)}
        </Text>

        {isBooked ? (
          <View style={styles.slotBookedBadge}>
            <MaterialCommunityIcons name="account-check" size={11} color={THEME.accent} />
            <Text style={styles.slotBookedText}>{slot.bookedCount}</Text>
          </View>
        ) : (
          <View style={[
            styles.slotStatusDot,
            { backgroundColor: isAvailable ? THEME.primary : '#CBD5E1' },
          ]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ── Main Component ────────────────────────────

const ManageSlotsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const {
    slots,
    clinics,
    selectedClinic,
    selectedDate,
    slotDuration,
    maxPatientsPerSlot,
    loading,
    saving,
    error,
    saveSuccess,
  } = useAppSelector((state) => state.manageSlots);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const prevDuration = useRef(slotDuration);
  const prevClinic = useRef(selectedClinic);
  const prevDate = useRef(selectedDate);

  useEffect(() => {
    dispatch(fetchSlots());
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
    ]).start();
    return () => { dispatch(resetManageSlots()); };
  }, [dispatch]);

  useEffect(() => {
    const clinicChanged = prevClinic.current !== selectedClinic;
    const dateChanged = prevDate.current !== selectedDate;
    const durationChanged = prevDuration.current !== slotDuration;
    if ((clinicChanged || dateChanged || durationChanged) && selectedClinic) {
      dispatch(fetchSlots({ clinicId: selectedClinic, date: selectedDate }));
    }
    prevClinic.current = selectedClinic;
    prevDate.current = selectedDate;
    prevDuration.current = slotDuration;
  }, [dispatch, selectedClinic, selectedDate, slotDuration]);

  // Success animation
  useEffect(() => {
    if (saveSuccess) {
      Animated.spring(successAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }).start();
      const t = setTimeout(() => {
        Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          dispatch(clearSaveSuccess());
        });
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [saveSuccess, dispatch]);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const todayStr = new Date().toISOString().split('T')[0];

  const handleClinicSelect = useCallback((id: string) => dispatch(setSelectedClinic(id)), [dispatch]);
  const handleDateSelect = useCallback((date: string) => dispatch(setSelectedDate(date)), [dispatch]);
  const handleDurationChange = useCallback((d: SlotDuration) => dispatch(setSlotDuration(d)), [dispatch]);
  const handleMaxPatientsChange = useCallback((n: number) => dispatch(setMaxPatientsPerSlot(n)), [dispatch]);
  const handleToggleSlot = useCallback((slotId: string) => dispatch(toggleSlot(slotId)), [dispatch]);

  const handleSave = useCallback(() => {
    dispatch(saveSlots());
  }, [dispatch]);

  const totalSlots = slots.length;
  const availableCount = slots.filter((s) => s.isAvailable && s.bookedCount === 0).length;
  const bookedCount = slots.filter((s) => s.bookedCount > 0).length;
  const canSave = !saving && slots.length > 0;

  // ── Loading ───────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.headerGradient}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Slots</Text>
          <View style={styles.backButton} />
        </LinearGradient>
        <View style={styles.centered}>
          <View style={styles.loadingIconWrap}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
          <Text style={styles.loadingText}>Loading time slots…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.headerGradient}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Slots</Text>
          <View style={styles.backButton} />
        </LinearGradient>
        <View style={styles.centered}>
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={40} color={THEME.error} />
          </LinearGradient>
          <Text style={styles.errorTitle}>Failed to load slots</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchSlots())} activeOpacity={0.85}>
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
      <LinearGradient
        colors={THEME.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerNav}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Manage Time Slots</Text>
            <Text style={styles.headerSubtitle}>Configure your availability</Text>
          </View>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Clinic Selector ── */}
        {clinics.length > 1 && (
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <View style={styles.cardLabelDot} />
              <Text style={styles.cardLabel}>Clinic</Text>
            </View>
            <View style={styles.clinicList}>
              {clinics.map((clinic) => {
                const isActive = clinic.clinicId === selectedClinic;
                return (
                  <TouchableOpacity
                    key={clinic.clinicId}
                    style={[styles.clinicCard, isActive && styles.clinicCardActive]}
                    onPress={() => handleClinicSelect(clinic.clinicId)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.clinicIconWrap, isActive ? {} : { backgroundColor: THEME.primaryLight }]}>
                      {isActive ? (
                        <LinearGradient colors={THEME.gradient.primary} style={styles.clinicIconGradient}>
                          <Ionicons name="business-outline" size={16} color="#FFFFFF" />
                        </LinearGradient>
                      ) : (
                        <View style={[styles.clinicIconGradient, { backgroundColor: THEME.primaryLight }]}>
                          <Ionicons name="business-outline" size={16} color={THEME.primary} />
                        </View>
                      )}
                    </View>
                    <View style={styles.clinicInfo}>
                      <Text style={[styles.clinicName, isActive && { color: THEME.primary }]} numberOfLines={1}>
                        {clinic.name}
                      </Text>
                      <Text style={styles.clinicAddress} numberOfLines={1}>{clinic.address}</Text>
                    </View>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={20} color={THEME.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Date Picker ── */}
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <View style={styles.cardLabelDot} />
            <Text style={styles.cardLabel}>Date</Text>
          </View>
          <View style={styles.dateStrip}>
            {weekDates.map((dateStr) => {
              const d = new Date(dateStr + 'T00:00:00');
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dateCell,
                    isSelected && styles.dateCellSelected,
                    isPast && styles.dateCellPast,
                  ]}
                  onPress={() => !isPast && handleDateSelect(dateStr)}
                  activeOpacity={isPast ? 1 : 0.75}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={THEME.gradient.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                    />
                  )}
                  <Text style={[
                    styles.dateDayName,
                    isSelected && styles.dateDayNameSelected,
                    isPast && styles.dateDimText,
                  ]}>
                    {WEEKDAY_LABELS[d.getDay()]}
                  </Text>
                  <Text style={[
                    styles.dateDayNumber,
                    isSelected && styles.dateDayNumberSelected,
                    isToday && !isSelected && { color: THEME.primary },
                    isPast && styles.dateDimText,
                  ]}>
                    {d.getDate()}
                  </Text>
                  {isToday && !isSelected && <View style={styles.todayDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Slot Duration ── */}
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <View style={styles.cardLabelDot} />
            <Text style={styles.cardLabel}>Slot Duration</Text>
          </View>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((opt) => {
              const isActive = opt.value === slotDuration;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.durationChip, isActive && styles.durationChipActive]}
                  onPress={() => handleDurationChange(opt.value)}
                  activeOpacity={0.8}
                >
                  {isActive && (
                    <LinearGradient
                      colors={THEME.gradient.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: 13 }]}
                    />
                  )}
                  <Text style={[styles.durationNum, isActive && { color: '#FFFFFF' }]}>{opt.label}</Text>
                  <Text style={[styles.durationSub, isActive && { color: 'rgba(255,255,255,0.8)' }]}>{opt.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Max Patients Stepper ── */}
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <View style={styles.cardLabelDot} />
            <Text style={styles.cardLabel}>Max Patients per Slot</Text>
          </View>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, maxPatientsPerSlot <= 1 && styles.stepperBtnDisabled]}
              onPress={() => handleMaxPatientsChange(maxPatientsPerSlot - 1)}
              disabled={maxPatientsPerSlot <= 1}
              activeOpacity={0.8}
            >
              <Ionicons name="remove" size={20} color={maxPatientsPerSlot <= 1 ? '#CBD5E1' : '#374151'} />
            </TouchableOpacity>

            <View style={styles.stepperValueBlock}>
              <Text style={styles.stepperValueNum}>{maxPatientsPerSlot}</Text>
              <Text style={styles.stepperValueLabel}>patient{maxPatientsPerSlot !== 1 ? 's' : ''}</Text>
            </View>

            <TouchableOpacity
              style={[styles.stepperBtn, maxPatientsPerSlot >= 10 && styles.stepperBtnDisabled]}
              onPress={() => handleMaxPatientsChange(maxPatientsPerSlot + 1)}
              disabled={maxPatientsPerSlot >= 10}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color={maxPatientsPerSlot >= 10 ? '#CBD5E1' : '#374151'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Slot Stats ── */}
        <LinearGradient colors={['#F0F7FF', '#EAF3FF']} style={styles.slotStatsStrip}>
          <View style={styles.slotStatItem}>
            <Text style={styles.slotStatValue}>{totalSlots}</Text>
            <Text style={styles.slotStatLabel}>Total</Text>
          </View>
          <View style={styles.slotStatDivider} />
          <View style={styles.slotStatItem}>
            <Text style={[styles.slotStatValue, { color: THEME.primary }]}>{availableCount}</Text>
            <Text style={[styles.slotStatLabel, { color: THEME.primary }]}>Available</Text>
          </View>
          <View style={styles.slotStatDivider} />
          <View style={styles.slotStatItem}>
            <Text style={[styles.slotStatValue, { color: THEME.accent }]}>{bookedCount}</Text>
            <Text style={[styles.slotStatLabel, { color: THEME.accent }]}>Booked</Text>
          </View>
        </LinearGradient>

        {/* ── Legend ── */}
        <View style={styles.legend}>
          {[
            { color: THEME.primary, bg: '#F0F7FF', label: 'Available' },
            { color: '#94A3B8', bg: '#F8FBFF', label: 'Blocked' },
            { color: THEME.accent, bg: '#EAF3FF', label: 'Booked' },
          ].map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: item.bg, borderColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Slot Grid ── */}
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <View style={styles.cardLabelDot} />
            <Text style={styles.cardLabel}>Time Slots</Text>
            {totalSlots > 0 && (
              <Text style={styles.cardLabelCount}>{totalSlots} slots</Text>
            )}
          </View>

          {slots.length === 0 ? (
            <View style={styles.emptySlots}>
              <LinearGradient colors={['#F0F7FF', '#D6E8FF']} style={styles.emptySlotsIcon}>
                <Ionicons name="time-outline" size={28} color={THEME.primary} />
              </LinearGradient>
              <Text style={styles.emptySlotsTitle}>No slots configured</Text>
              <Text style={styles.emptySlotsSubtext}>Adjust the settings above to generate slots</Text>
            </View>
          ) : (
            <View style={styles.slotGrid}>
              {slots.map((slot) => (
                <SlotGridItem key={slot.slotId} slot={slot} onToggle={handleToggleSlot} />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* ── Bottom Save Bar ── */}
      <View style={styles.bottomBar}>
        <Animated.View
          style={[
            styles.successBanner,
            {
              opacity: successAnim,
              transform: [{ translateY: successAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient colors={THEME.gradient.success} style={styles.successBannerGradient}>
            <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
            <Text style={styles.successText}>Slots saved successfully!</Text>
          </LinearGradient>
        </Animated.View>

        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          {canSave ? (
            <LinearGradient
              colors={THEME.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          ) : (
            <View style={styles.saveButtonGradient}>
              <Ionicons name="save-outline" size={20} color="#94A3B8" />
              <Text style={[styles.saveButtonText, { color: '#94A3B8' }]}>No slots to save</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ManageSlotsScreen;

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

  // Header
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,
    paddingBottom: 14,
  },
  headerNav: {
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

  // Scroll
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
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
  cardLabelCount: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },

  // Clinic
  clinicList: {
    gap: 8,
  },
  clinicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  clinicCardActive: {
    borderColor: THEME.primary,
    backgroundColor: '#F0F7FF',
  },
  clinicIconWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  clinicIconGradient: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clinicInfo: { flex: 1 },
  clinicName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  clinicAddress: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },

  // Date strip
  dateStrip: {
    flexDirection: 'row',
    gap: 6,
  },
  dateCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    gap: 2,
  },
  dateCellSelected: {
    borderColor: 'transparent',
  },
  dateCellPast: {
    opacity: 0.4,
  },
  dateDayName: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dateDayNameSelected: { color: 'rgba(255,255,255,0.85)' },
  dateDayNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateDayNumberSelected: { color: '#FFFFFF' },
  dateDimText: { color: '#CBD5E1' },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.primary,
  },

  // Duration
  durationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  durationChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 13,
    backgroundColor: '#F8FBFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    gap: 2,
  },
  durationChipActive: {
    borderColor: 'transparent',
  },
  durationNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: -0.4,
  },
  durationSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: '#F8FBFF',
    borderRadius: 14,
    paddingVertical: 16,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  stepperBtnDisabled: {
    opacity: 0.4,
    elevation: 0,
    shadowColor: 'transparent',
  },
  stepperValueBlock: {
    alignItems: 'center',
    minWidth: 56,
  },
  stepperValueNum: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: -1,
  },
  stepperValueLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Slot stats
  slotStatsStrip: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#B8D4FF',
    alignItems: 'center',
  },
  slotStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  slotStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  slotStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  slotStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#B8D4FF',
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  // Slot grid
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotCell: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 5,
  },
  slotTime: {
    fontSize: 11,
    fontWeight: '700',
  },
  slotStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  slotBookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D6E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  slotBookedText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.accent,
  },

  // Empty slots
  emptySlots: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptySlotsIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptySlotsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  emptySlotsSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Bottom bar
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  successBanner: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  successBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  successText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saveButton: {
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: THEME.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 5 },
    }),
  },
  saveButtonDisabled: {
    backgroundColor: '#F1F5F9',
    shadowColor: 'transparent',
    elevation: 0,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});