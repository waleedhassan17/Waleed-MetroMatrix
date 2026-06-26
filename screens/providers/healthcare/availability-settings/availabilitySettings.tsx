import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Switch,
  Alert,
  Modal,
  TextInput,
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
  fetchSettings,
  saveSettings,
  generateSlots,
  toggleDayWorking,
  toggleDayMode,
  updateDayMode,
  addVacation,
  removeVacation,
  toggleInstantBooking,
  toggleVideoConsultation,
  clearSaveSuccess,
  resetAvailabilitySettings,
  Weekday,
  DaySchedule,
  VacationDate,
} from './availabilitySettingsSlice';

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
    warm: ['#F59E0B', '#EF4444'] as [string, string],
  },
};

// ── Constants ─────────────────────────────────

const HOUR_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    HOUR_OPTIONS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

const DAY_SHORT: Record<Weekday, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

const DAY_COLORS: Record<Weekday, { gradient: [string, string]; bg: string }> = {
  Monday:    { gradient: ['#2A7FFF', '#1E6AE1'], bg: '#F0F7FF' },
  Tuesday:   { gradient: ['#5A9FFF', '#1E6AE1'], bg: '#EAF3FF' },
  Wednesday: { gradient: ['#10B981', '#059669'], bg: '#F0FDF4' },
  Thursday:  { gradient: ['#2A7FFF', '#1E6AE1'], bg: '#EAF3FF' },
  Friday:    { gradient: ['#F59E0B', '#D97706'], bg: '#FFFBEB' },
  Saturday:  { gradient: ['#2A7FFF', '#1E6AE1'], bg: '#EAF3FF' },
  Sunday:    { gradient: ['#94A3B8', '#64748B'], bg: '#F8FBFF' },
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Helpers ───────────────────────────────────

const formatTime12 = (time24: string): string => {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const formatVacationDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

// ── Time Picker Modal ─────────────────────────

const TimePicker: React.FC<{
  visible: boolean;
  title: string;
  value: string;
  onSelect: (time: string) => void;
  onClose: () => void;
}> = ({ visible, title, value, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="slide">
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />

        {/* Modal header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.timeList} showsVerticalScrollIndicator={false}>
          {HOUR_OPTIONS.map((time) => {
            const isSelected = time === value;
            return (
              <TouchableOpacity
                key={time}
                style={[styles.timeOption, isSelected && styles.timeOptionSelected]}
                onPress={() => { onSelect(time); onClose(); }}
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
                <Text style={[styles.timeOptionText, isSelected && styles.timeOptionTextSelected]}>
                  {formatTime12(time)}
                </Text>
                {isSelected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ── Day Schedule Row ──────────────────────────

const MODE_META = {
  online: { icon: 'videocam-outline' as const, color: '#2A7FFF', label: 'Online (Video)' },
  onsite: { icon: 'business-outline' as const, color: '#10B981', label: 'Onsite (Clinic)' },
};

const DayScheduleRow: React.FC<{
  schedule: DaySchedule;
  onToggleWorking: () => void;
  onToggleMode: (mode: 'online' | 'onsite') => void;
  onTimePress: (mode: 'online' | 'onsite', field: 'startTime' | 'endTime') => void;
  index: number;
}> = ({ schedule, onToggleWorking, onToggleMode, onTimePress }) => {
  const dc = DAY_COLORS[schedule.day];
  const pressAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(pressAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(pressAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
    ]).start();
    onToggleWorking();
  };

  const renderMode = (mode: 'online' | 'onsite') => {
    const m = schedule[mode];
    const meta = MODE_META[mode];
    return (
      <View style={modeStyles.modeRow} key={mode}>
        <TouchableOpacity
          style={[modeStyles.modeTag, m.enabled && { backgroundColor: `${meta.color}14`, borderColor: meta.color }]}
          onPress={() => onToggleMode(mode)}
          activeOpacity={0.8}
        >
          <Ionicons name={meta.icon} size={13} color={m.enabled ? meta.color : '#94A3B8'} />
          <Text style={[modeStyles.modeTagText, { color: m.enabled ? meta.color : '#94A3B8' }]}>{meta.label}</Text>
        </TouchableOpacity>
        {m.enabled ? (
          <View style={modeStyles.modeTimes}>
            <TouchableOpacity style={styles.timeChip} onPress={() => onTimePress(mode, 'startTime')} activeOpacity={0.75}>
              <Text style={styles.timeChipText}>{formatTime12(m.startTime)}</Text>
            </TouchableOpacity>
            <View style={styles.timeDash} />
            <TouchableOpacity style={styles.timeChip} onPress={() => onTimePress(mode, 'endTime')} activeOpacity={0.75}>
              <Text style={[styles.timeChipText, { color: '#1E6AE1' }]}>{formatTime12(m.endTime)}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={modeStyles.modeOff}>Not available</Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.dayRow, !schedule.isWorking && styles.dayRowOff, modeStyles.dayRowCol]}>
      <View style={modeStyles.dayHeader}>
        <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
          <TouchableOpacity
            style={[styles.dayToggle, schedule.isWorking && styles.dayToggleActive]}
            onPress={handlePress}
            activeOpacity={0.85}
          >
            {schedule.isWorking ? (
              <LinearGradient colors={dc.gradient} style={styles.dayToggleGradient}>
                <Text style={styles.dayLabelActive}>{DAY_SHORT[schedule.day]}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.dayToggleInactive}>
                <Text style={styles.dayLabel}>{DAY_SHORT[schedule.day]}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
        {!schedule.isWorking && (
          <View style={styles.dayOffContainer}>
            <Ionicons name="close-outline" size={14} color="#CBD5E1" />
            <Text style={styles.dayOffText}>Day Off — tap to enable</Text>
          </View>
        )}
      </View>

      {schedule.isWorking && (
        <View style={modeStyles.modesWrap}>
          {renderMode('online')}
          {renderMode('onsite')}
        </View>
      )}
    </View>
  );
};

const modeStyles = StyleSheet.create({
  dayRowCol: { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modesWrap: { gap: 8, paddingLeft: 4 },
  modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  modeTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  modeTagText: { fontSize: 12, fontWeight: '700' },
  modeTimes: { flexDirection: 'row', alignItems: 'center' },
  modeOff: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
});

// ── Vacation Card ─────────────────────────────

const VacationCard: React.FC<{
  vacation: VacationDate;
  onRemove: () => void;
}> = ({ vacation, onRemove }) => {
  const isSingleDay = vacation.startDate === vacation.endDate;
  const dateLabel = isSingleDay
    ? formatVacationDate(vacation.startDate)
    : `${formatVacationDate(vacation.startDate)} – ${formatVacationDate(vacation.endDate)}`;

  return (
    <View style={styles.vacationCard}>
      <View style={styles.vacationIconWrap}>
        <LinearGradient colors={THEME.gradient.warm} style={styles.vacationIconGradient}>
          <Ionicons name="calendar" size={16} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <View style={styles.vacationInfo}>
        <Text style={styles.vacationDate}>{dateLabel}</Text>
        {vacation.reason ? (
          <Text style={styles.vacationReason}>{vacation.reason}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.vacationRemove}
        onPress={onRemove}
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={15} color={THEME.error} />
      </TouchableOpacity>
    </View>
  );
};

// ── Add Vacation Modal ────────────────────────

const AddVacationModal: React.FC<{
  visible: boolean;
  onAdd: (v: { startDate: string; endDate: string; reason: string }) => void;
  onClose: () => void;
}> = ({ visible, onAdd, onClose }) => {
  const todayISO = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayISO);
  const [endDate, setEndDate] = useState(todayISO);
  const [reason, setReason] = useState('');

  const handleAdd = () => {
    if (startDate > endDate) {
      Alert.alert('Invalid Range', 'End date must be on or after start date.');
      return;
    }
    onAdd({ startDate, endDate, reason: reason.trim() });
    setStartDate(todayISO);
    setEndDate(todayISO);
    setReason('');
    onClose();
  };

  const InputField: React.FC<{
    label: string;
    value: string;
    onChange: (t: string) => void;
    placeholder: string;
    icon: keyof typeof Ionicons.glyphMap;
  }> = ({ label, value, onChange, placeholder, icon }) => (
    <View style={styles.vacFormGroup}>
      <Text style={styles.vacFormLabel}>{label}</Text>
      <View style={styles.vacInputWrapper}>
        <View style={styles.vacInputIcon}>
          <Ionicons name={icon} size={15} color={THEME.primary} />
        </View>
        <TextInput
          style={styles.vacTextInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#CBD5E1"
        />
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={[styles.modalSheet, styles.vacModalSheet]} activeOpacity={1}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <View style={styles.vacModalTitleRow}>
              <LinearGradient colors={THEME.gradient.warm} style={styles.vacModalIcon}>
                <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.modalTitle}>Add Vacation / Leave</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <InputField
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            placeholder="YYYY-MM-DD"
            icon="calendar-outline"
          />
          <InputField
            label="End Date"
            value={endDate}
            onChange={setEndDate}
            placeholder="YYYY-MM-DD"
            icon="calendar-outline"
          />
          <InputField
            label="Reason (optional)"
            value={reason}
            onChange={setReason}
            placeholder="e.g. Family event"
            icon="document-text-outline"
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} activeOpacity={0.75}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalAddBtn} onPress={handleAdd} activeOpacity={0.85}>
              <LinearGradient colors={THEME.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalAddBtnGradient}>
                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.modalAddText}>Add Leave</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ── Toggle Card ───────────────────────────────

const ToggleCard: React.FC<{
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  gradient?: [string, string];
}> = ({ icon, iconBg, iconColor, label, description, value, onToggle, gradient }) => (
  <View style={[styles.toggleCard, value && styles.toggleCardActive]}>
    <View style={styles.toggleLeft}>
      <View style={[styles.toggleIconWrap, { backgroundColor: iconBg }]}>
        {gradient ? (
          <LinearGradient colors={gradient} style={styles.toggleIconGradient}>
            <MaterialCommunityIcons name={icon as any} size={17} color="#FFFFFF" />
          </LinearGradient>
        ) : (
          <View style={[styles.toggleIconGradient, { backgroundColor: iconBg }]}>
            <Ionicons name={icon as any} size={17} color={iconColor} />
          </View>
        )}
      </View>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{description}</Text>
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: '#E2E8F0', true: `${THEME.primary}55` }}
      thumbColor={value ? THEME.primary : '#CBD5E1'}
      ios_backgroundColor="#E2E8F0"
    />
  </View>
);

// ── Main Component ────────────────────────────

const AvailabilitySettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const {
    weeklySchedule,
    vacationDates,
    instantBooking,
    videoConsultation,
    loading,
    saving,
    error,
    saveSuccess,
  } = useAppSelector((state) => state.availabilitySettings);

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<{
    day: Weekday;
    mode: 'online' | 'onsite';
    field: 'startTime' | 'endTime';
  } | null>(null);
  const [vacationModalVisible, setVacationModalVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const sectionAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    dispatch(fetchSettings());
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
      Animated.stagger(
        90,
        sectionAnims.map((a) =>
          Animated.spring(a, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true })
        )
      ),
    ]).start();
    return () => { dispatch(resetAvailabilitySettings()); };
  }, [dispatch]);

  // Success banner animation
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

  const currentTimeValue = timePickerTarget
    ? weeklySchedule.find((s) => s.day === timePickerTarget.day)?.[timePickerTarget.mode]?.[timePickerTarget.field] ?? '09:00'
    : '09:00';

  const handleOpenTimePicker = useCallback((day: Weekday, mode: 'online' | 'onsite', field: 'startTime' | 'endTime') => {
    setTimePickerTarget({ day, mode, field });
    setTimePickerVisible(true);
  }, []);

  const handleTimeSelect = useCallback((time: string) => {
    if (timePickerTarget) {
      dispatch(updateDayMode({
        day: timePickerTarget.day,
        mode: timePickerTarget.mode,
        updates: { [timePickerTarget.field]: time },
      }));
    }
  }, [dispatch, timePickerTarget]);

  const handleToggleWorking = useCallback((day: Weekday) => {
    dispatch(toggleDayWorking({ day }));
  }, [dispatch]);

  const handleToggleMode = useCallback((day: Weekday, mode: 'online' | 'onsite') => {
    dispatch(toggleDayMode({ day, mode }));
  }, [dispatch]);

  const handleAddVacation = useCallback(
    (v: { startDate: string; endDate: string; reason: string }) => {
      dispatch(addVacation(v));
    },
    [dispatch],
  );

  const handleRemoveVacation = useCallback((id: string) => {
    Alert.alert('Remove Leave', 'Remove this vacation/leave entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => dispatch(removeVacation(id)) },
    ]);
  }, [dispatch]);

  const handleSave = useCallback(async () => {
    const r = await dispatch(saveSettings());
    // Persist availability, then auto-generate bookable slots for the next 30 days.
    if (saveSettings.fulfilled.match(r)) {
      dispatch(generateSlots({ days: 30 }));
    }
  }, [dispatch]);

  const hoursOf = (m: { enabled: boolean; startTime: string; endTime: string }) => {
    if (!m?.enabled) return 0;
    const [sh, sm] = m.startTime.split(':').map(Number);
    const [eh, em] = m.endTime.split(':').map(Number);
    return Math.max(0, (eh + em / 60) - (sh + sm / 60));
  };
  const workingDays = weeklySchedule.filter((s) => s.isWorking).length;
  const totalHours = weeklySchedule
    .filter((s) => s.isWorking)
    .reduce((acc, s) => acc + hoursOf(s.online) + hoursOf(s.onsite), 0);

  // ── Loading ───────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Availability</Text>
          </View>
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
        <LinearGradient colors={THEME.gradient.primary} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Availability</Text>
          </View>
          <View style={styles.backButton} />
        </LinearGradient>
        <View style={styles.centered}>
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={40} color={THEME.error} />
          </LinearGradient>
          <Text style={styles.errorTitle}>Failed to load settings</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchSettings())} activeOpacity={0.85}>
            <LinearGradient colors={THEME.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.retryBtnGradient}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main Render ───────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={THEME.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Availability</Text>
          <Text style={styles.headerSubtitle}>Manage your schedule</Text>
        </View>
        <TouchableOpacity style={styles.headerSaveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </LinearGradient>

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Stats Strip ── */}
        <Animated.View style={[styles.sectionAnim, {
          opacity: sectionAnims[0],
          transform: [{ translateY: sectionAnims[0].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
        }]}>
          <LinearGradient colors={['#F0F7FF', '#EAF3FF']} style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{workingDays}</Text>
              <Text style={styles.statLabel}>Work Days</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalHours.toFixed(0)}h</Text>
              <Text style={styles.statLabel}>Weekly Hrs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{vacationDates.length}</Text>
              <Text style={styles.statLabel}>Leaves</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statStatusDot, {
                backgroundColor: instantBooking ? THEME.success : '#CBD5E1',
              }]} />
              <Text style={styles.statLabel}>Instant Booking</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Weekly Schedule ── */}
        <Animated.View style={[styles.sectionAnim, {
          opacity: sectionAnims[1],
          transform: [{ translateY: sectionAnims[1].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
        }]}>
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <View style={styles.cardLabelDot} />
              <Text style={styles.cardLabel}>Weekly Schedule</Text>
              <View style={styles.workingDaysBadge}>
                <Text style={styles.workingDaysBadgeText}>{workingDays}/7 days</Text>
              </View>
            </View>

            <View style={styles.scheduleGrid}>
              {weeklySchedule.map((schedule, index) => (
                <DayScheduleRow
                  key={schedule.day}
                  schedule={schedule}
                  index={index}
                  onToggleWorking={() => handleToggleWorking(schedule.day)}
                  onToggleMode={(mode) => handleToggleMode(schedule.day, mode)}
                  onTimePress={(mode, field) => handleOpenTimePicker(schedule.day, mode, field)}
                />
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ── Vacation / Leave ── */}
        <Animated.View style={[styles.sectionAnim, {
          opacity: sectionAnims[2],
          transform: [{ translateY: sectionAnims[2].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
        }]}>
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <View style={[styles.cardLabelDot, { backgroundColor: THEME.warning }]} />
              <Text style={styles.cardLabel}>Vacation / Leave</Text>
              <TouchableOpacity
                style={styles.addLeaveBtn}
                onPress={() => setVacationModalVisible(true)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={THEME.gradient.warm}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addLeaveBtnGradient}
                >
                  <Ionicons name="add" size={14} color="#FFFFFF" />
                  <Text style={styles.addLeaveBtnText}>Add Leave</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {vacationDates.length === 0 ? (
              <View style={styles.emptyVacation}>
                <LinearGradient colors={['#FFFBEB', '#FEF3C7']} style={styles.emptyVacationIconWrap}>
                  <Ionicons name="sunny-outline" size={28} color={THEME.warning} />
                </LinearGradient>
                <Text style={styles.emptyVacationTitle}>No leaves scheduled</Text>
                <Text style={styles.emptyVacationSubtext}>Tap "Add Leave" to block out vacation dates</Text>
              </View>
            ) : (
              <View style={styles.vacationList}>
                {vacationDates.map((vacation) => (
                  <VacationCard
                    key={vacation.id}
                    vacation={vacation}
                    onRemove={() => handleRemoveVacation(vacation.id)}
                  />
                ))}
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Booking Preferences ── */}
        <Animated.View style={[styles.sectionAnim, {
          opacity: sectionAnims[3],
          transform: [{ translateY: sectionAnims[3].interpolate({ inputRange: [0,1], outputRange: [20,0] }) }],
        }]}>
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <View style={[styles.cardLabelDot, { backgroundColor: THEME.accent }]} />
              <Text style={styles.cardLabel}>Booking Preferences</Text>
            </View>

            <ToggleCard
              icon="flash"
              iconBg="#FFFBEB"
              iconColor={THEME.warning}
              gradient={['#F59E0B', '#D97706']}
              label="Instant Booking"
              description="Patients can book without your approval"
              value={instantBooking}
              onToggle={() => dispatch(toggleInstantBooking())}
            />

            <View style={styles.toggleDivider} />

            <ToggleCard
              icon="video-outline"
              iconBg="#EAF3FF"
              iconColor={THEME.accent}
              gradient={['#5A9FFF', '#1E6AE1']}
              label="Video Consultation"
              description="Accept video call appointments"
              value={videoConsultation}
              onToggle={() => dispatch(toggleVideoConsultation())}
            />
          </View>
        </Animated.View>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* ── Bottom Save Bar ── */}
      <View style={styles.bottomBar}>
        {/* Success banner */}
        <Animated.View
          style={[
            styles.successBanner,
            {
              opacity: successAnim,
              transform: [{ translateY: successAnim.interpolate({ inputRange: [0,1], outputRange: [10, 0] }) }],
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient colors={THEME.gradient.success} style={styles.successBannerGradient}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={styles.successText}>Settings saved successfully!</Text>
          </LinearGradient>
        </Animated.View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <View style={styles.saveButtonGradient}>
              <ActivityIndicator size="small" color="#94A3B8" />
              <Text style={[styles.saveButtonText, { color: '#94A3B8' }]}>Saving…</Text>
            </View>
          ) : (
            <LinearGradient
              colors={THEME.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              <Ionicons name="save-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Modals ── */}
      <TimePicker
        visible={timePickerVisible}
        title={
          timePickerTarget
            ? `${timePickerTarget.field === 'startTime' ? 'Start' : 'End'} Time · ${timePickerTarget.day}`
            : ''
        }
        value={currentTimeValue}
        onSelect={handleTimeSelect}
        onClose={() => setTimePickerVisible(false)}
      />

      <AddVacationModal
        visible={vacationModalVisible}
        onAdd={handleAddVacation}
        onClose={() => setVacationModalVisible(false)}
      />
    </SafeAreaView>
  );
};

export default AvailabilitySettingsScreen;

// ── Styles ─────────────────────────────────────

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
  headerSaveBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionAnim: {
    marginBottom: 14,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
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
  workingDaysBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  workingDaysBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#B8D4FF',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#B8D4FF',
  },
  statStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Day schedule
  scheduleGrid: {
    gap: 8,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  dayRowOff: {
    opacity: 0.6,
  },
  dayToggle: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  dayToggleActive: {},
  dayToggleGradient: {
    width: 50,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayToggleInactive: {
    width: 50,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  dayLabelActive: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dayTimes: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EAF3FF',
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },
  timeDash: {
    width: 10,
    height: 1.5,
    backgroundColor: '#CBD5E1',
    borderRadius: 1,
  },
  dayOffContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 4,
  },
  dayOffText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#CBD5E1',
    fontStyle: 'italic',
  },

  // Vacation
  addLeaveBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  addLeaveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addLeaveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyVacation: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyVacationIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyVacationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  emptyVacationSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
  },
  vacationList: {
    gap: 8,
  },
  vacationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  vacationIconWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  vacationIconGradient: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vacationInfo: {
    flex: 1,
  },
  vacationDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  vacationReason: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
    marginTop: 2,
  },
  vacationRemove: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Toggle cards
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FBFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  toggleCardActive: {
    backgroundColor: '#FAFEFF',
    borderColor: '#BFDBFE',
  },
  toggleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  toggleIconWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleIconGradient: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleInfo: { flex: 1 },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  toggleDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  toggleDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
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
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
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
      ios: {
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
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

  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '72%',
  },
  vacModalSheet: {
    maxHeight: '80%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 12,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    flex: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Time picker
  timeList: {
    maxHeight: 340,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 3,
    overflow: 'hidden',
  },
  timeOptionSelected: {},
  timeOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  timeOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Vacation form
  vacModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vacModalIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vacFormGroup: {
    marginBottom: 14,
  },
  vacFormLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  vacInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    gap: 10,
  },
  vacInputIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vacTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  modalAddBtn: {
    flex: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalAddBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  modalAddText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});