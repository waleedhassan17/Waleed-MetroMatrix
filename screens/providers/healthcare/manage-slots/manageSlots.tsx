import { toLocalISODate, todayLocalISODate } from '../../../../utils/date/localDate';
import React, { useEffect, useMemo, useCallback, useState } from 'react';
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
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { darkShift, type DarkShift } from '../../../../constants/darkShift';
import { barStyleOn, useTheme } from '../../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../../../../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { DoctorRouteNames } from '../../../../navigation-maps/Healthcare';
import type {
  DoctorSlot,
  DoctorSlotState,
  NewSlotType,
  SlotKind,
} from '../../../../models/healthcare/types';
import {
  fetchSlots,
  createSlotsFromRange,
  editSlot,
  deleteSlot,
  respondToRequest,
  setSelectedClinic,
  setSelectedDate,
  setSlotDuration,
  setMaxPatientsPerSlot,
  setNewSlotType,
  setRangeStart,
  setRangeEnd,
  clearMessages,
  addClinic,
  removeClinic,
  buildRangeSlots,
  toMinutes,
  fromMinutes,
  SlotDuration,
} from './manageSlotsSlice';

// ── Theme ─────────────────────────────────────
import { DOCTOR_THEME as THEME } from '../../../../constants/DoctorTheme';

// Clinic management: adding, selecting and removing the doctor's own clinics,
// and the bottom sheets reused for slot actions and editing.
const msClinicStyles = StyleSheet.create({
  addBtn: {
    marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    backgroundColor: THEME.primaryLight,
  },
  addBtnText: { fontSize: 12, fontWeight: '800', color: THEME.primary },
  empty: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 12 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: THEME.textDark, marginTop: 8 },
  emptyText: { fontSize: 12.5, color: THEME.textLight, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  hint: { fontSize: 11.5, color: THEME.textLight, marginTop: 10, fontStyle: 'italic' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28,
  },
  sheetHandle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0', marginBottom: 14,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: THEME.textDark },
  sheetSub: { fontSize: 12.5, color: THEME.textLight, marginTop: 3, marginBottom: 16, lineHeight: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: THEME.textDark, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: THEME.textDark,
    backgroundColor: '#F8FBFF',
  },
  submit: {
    marginTop: 22, height: 50, borderRadius: 14, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  submitGradient: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
  },
  submitText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  submitDisabled: { backgroundColor: '#CBD5E1' },
  cancel: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: THEME.textLight, fontWeight: '700', fontSize: 13.5 },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  actionIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  actionText: { fontSize: 15, fontWeight: '700', color: THEME.textDark },
  actionSub: { fontSize: 12, color: THEME.textLight, marginTop: 1 },
});

const DURATION_OPTIONS: { label: string; value: SlotDuration; sub: string }[] = [
  { label: '15', value: 15, sub: 'min' },
  { label: '20', value: 20, sub: 'min' },
  { label: '30', value: 30, sub: 'min' },
];

const TYPE_OPTIONS: { value: NewSlotType; label: string; icon: any; sub: string }[] = [
  { value: 'video', label: 'Video', icon: 'videocam-outline', sub: 'Online consult' },
  { value: 'in-clinic', label: 'In-Clinic', icon: 'business-outline', sub: 'At a clinic' },
  { value: 'both', label: 'Both', icon: 'swap-horizontal-outline', sub: 'Patient chooses' },
];

/**
 * What each state means to the doctor. Every state a slot can be in has a
 * distinct label and colour — the old grid had three (available / blocked /
 * booked), so a slot waiting on the doctor's approval looked identical to one
 * already confirmed.
 */
const STATE_META: Record<DoctorSlotState, { label: string; color: string; bg: string; icon: any }> = {
  open: { label: 'Open', color: THEME.success, bg: THEME.successLight, icon: 'checkmark-circle-outline' },
  requested: { label: 'Requested', color: THEME.warning, bg: THEME.warningLight, icon: 'hourglass-outline' },
  booked: { label: 'Booked', color: THEME.accent, bg: THEME.accentLight, icon: 'person' },
  held: { label: 'Held', color: '#64748B', bg: '#F1F5F9', icon: 'lock-closed-outline' },
  blocked: { label: 'Closed', color: '#94A3B8', bg: '#F8FAFC', icon: 'close-circle-outline' },
  past: { label: 'Past', color: '#CBD5E1', bg: '#F8FAFC', icon: 'time-outline' },
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The last minute a range may end on — "24:00" is not a valid HH:MM. */
const RANGE_MAX = 23 * 60 + 30;
const RANGE_STEP = 30;

const formatTime12 = (time24: string): string => {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const typeLabel = (t: SlotKind) => (t === 'video' ? 'video' : 'in-clinic');

const getWeekDates = (centerDate: string): string[] => {
  const d = new Date(centerDate + 'T00:00:00');
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return toLocalISODate(day);
  });
};

// ── Time stepper ──────────────────────────────

const TimeStepper: React.FC<{
  label: string;
  value: string;
  min: number;
  max: number;
  step?: number;
  onChange: (hhmm: string) => void;
}> = ({ label, value, min, max, step = RANGE_STEP, onChange }) => {
  const mins = toMinutes(value);
  const canDown = mins - step >= min;
  const canUp = mins + step <= max;
  return (
    <View style={tsStyles.wrap}>
      <Text style={tsStyles.label}>{label}</Text>
      <View style={tsStyles.row}>
        <TouchableOpacity
          style={[tsStyles.btn, !canDown && tsStyles.btnDisabled]}
          disabled={!canDown}
          onPress={() => onChange(fromMinutes(mins - step))}
          accessibilityLabel={`${label} earlier`}
        >
          <Ionicons name="remove" size={18} color={canDown ? '#374151' : '#CBD5E1'} />
        </TouchableOpacity>
        <Text style={tsStyles.value}>{formatTime12(value)}</Text>
        <TouchableOpacity
          style={[tsStyles.btn, !canUp && tsStyles.btnDisabled]}
          disabled={!canUp}
          onPress={() => onChange(fromMinutes(mins + step))}
          accessibilityLabel={`${label} later`}
        >
          <Ionicons name="add" size={18} color={canUp ? '#374151' : '#CBD5E1'} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const tsStyles = StyleSheet.create({
  wrap: { flex: 1 },
  label: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase',
    letterSpacing: 0.3, marginBottom: 6,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FBFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 6, paddingVertical: 6,
  },
  btn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  value: { fontSize: 14, fontWeight: '800', color: THEME.textDark },
});

// ── Slot cell ─────────────────────────────────

const SlotCell: React.FC<{
  slot: DoctorSlot;
  busy: boolean;
  onPress: (slot: DoctorSlot) => void;
  styles: ReturnType<typeof makeStyles>;
}> = React.memo(({ slot, busy, onPress, styles }) => {
  const meta = STATE_META[slot.state];
  const dim = slot.state === 'past' || slot.state === 'blocked';
  return (
    <TouchableOpacity
      style={[styles.slotCell, { backgroundColor: meta.bg, borderColor: meta.color }, dim && { opacity: 0.7 }]}
      onPress={() => onPress(slot)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${formatTime12(slot.startTime)} ${typeLabel(slot.type)} slot, ${meta.label}`}
    >
      <View style={styles.slotTypeRow}>
        <Ionicons
          name={slot.type === 'video' ? 'videocam' : 'business'}
          size={10}
          color={slot.type === 'video' ? '#2A7FFF' : '#10B981'}
        />
        <Text style={[styles.slotTypeText, { color: slot.type === 'video' ? '#2A7FFF' : '#10B981' }]}>
          {slot.type === 'video' ? 'Video' : 'Clinic'}
        </Text>
      </View>
      <Text numberOfLines={1} style={[styles.slotTime, { color: THEME.textDark }]}>
        {formatTime12(slot.startTime)}
      </Text>
      {busy ? (
        <ActivityIndicator size="small" color={meta.color} />
      ) : (
        <View style={styles.slotStateRow}>
          <Ionicons name={meta.icon} size={10} color={meta.color} />
          <Text style={[styles.slotStateText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ── Main Component ────────────────────────────

const ManageSlotsScreen: React.FC = () => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const {
    slots,
    clinics,
    selectedClinic,
    selectedDate,
    slotDuration,
    maxPatientsPerSlot,
    newSlotType,
    rangeStart,
    rangeEnd,
    loading,
    creating,
    busySlotId,
    error,
    actionError,
    notice,
    clinicSaving,
  } = useAppSelector((state) => state.manageSlots);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchSlots());
    }, [dispatch]),
  );

  // Refetch whenever the day changes — every slot state comes from the server.
  useEffect(() => {
    dispatch(fetchSlots({ date: selectedDate }));
  }, [dispatch, selectedDate]);

  // Let a confirmation linger long enough to read, then clear it.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => dispatch(clearMessages()), 3500);
    return () => clearTimeout(t);
  }, [notice, dispatch]);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const todayStr = todayLocalISODate();

  // ── Clinics ──
  const [clinicFormVisible, setClinicFormVisible] = useState(false);
  const [clinicForm, setClinicForm] = useState({ name: '', address: '', city: '', phone: '' });
  const canSubmitClinic =
    clinicForm.name.trim().length > 1 &&
    clinicForm.address.trim().length > 2 &&
    clinicForm.city.trim().length > 1;

  const handleSubmitClinic = useCallback(async () => {
    if (!canSubmitClinic) return;
    const result = await dispatch(addClinic({
      name: clinicForm.name.trim(),
      address: clinicForm.address.trim(),
      city: clinicForm.city.trim(),
      phone: clinicForm.phone.trim() || undefined,
    }));
    if (addClinic.rejected.match(result)) {
      Alert.alert('Could not add clinic', (result.payload as string) || 'Please try again.');
      return;
    }
    setClinicForm({ name: '', address: '', city: '', phone: '' });
    setClinicFormVisible(false);
  }, [dispatch, clinicForm, canSubmitClinic]);

  const handleRemoveClinic = useCallback((clinic: { clinicId: string; name: string }) => {
    Alert.alert(
      'Remove clinic',
      `Remove "${clinic.name}"? Slots already created for it are not deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => dispatch(removeClinic(clinic.clinicId)) },
      ],
    );
  }, [dispatch]);

  // ── Dates ──
  const handleNextWeek = useCallback(() => {
    const next = new Date(selectedDate + 'T00:00:00');
    next.setDate(next.getDate() + 7);
    dispatch(setSelectedDate(toLocalISODate(next)));
  }, [selectedDate, dispatch]);

  const handlePrevWeek = useCallback(() => {
    const prev = new Date(selectedDate + 'T00:00:00');
    prev.setDate(prev.getDate() - 7);
    const key = toLocalISODate(prev);
    dispatch(setSelectedDate(key < todayStr ? todayStr : key));
  }, [selectedDate, todayStr, dispatch]);

  // ── Add slots ──
  const plannedTimes = useMemo(
    () => buildRangeSlots(selectedDate, rangeStart, rangeEnd, slotDuration),
    [selectedDate, rangeStart, rangeEnd, slotDuration],
  );
  const perTime = newSlotType === 'both' ? 2 : 1;
  const plannedCount = plannedTimes.length * perTime;
  const needsClinic = newSlotType !== 'video';
  const selectedClinicName = clinics.find((c) => c.clinicId === selectedClinic)?.name;
  const isPastDay = selectedDate < todayStr;
  const canCreate = !creating && plannedCount > 0 && (!needsClinic || !!selectedClinic) && !isPastDay;

  const handleCreate = useCallback(() => {
    dispatch(createSlotsFromRange());
  }, [dispatch]);

  // ── Slot actions ──
  const [actionSlot, setActionSlot] = useState<DoctorSlot | null>(null);
  const [editing, setEditing] = useState<DoctorSlot | null>(null);
  const [draft, setDraft] = useState<{ startTime: string; endTime: string; type: SlotKind; clinicId: string | null }>({
    startTime: '09:00', endTime: '09:30', type: 'video', clinicId: null,
  });

  const openEdit = useCallback((slot: DoctorSlot) => {
    setActionSlot(null);
    setDraft({
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: slot.type,
      clinicId: slot.clinic?.id ?? selectedClinic,
    });
    setEditing(slot);
  }, [selectedClinic]);

  const confirmDelete = useCallback((slot: DoctorSlot) => {
    setActionSlot(null);
    Alert.alert(
      'Delete slot',
      `Delete the ${typeLabel(slot.type)} slot at ${formatTime12(slot.startTime)}? Patients will no longer see it.`,
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteSlot(slot.id)) },
      ],
    );
  }, [dispatch]);

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    const result = await dispatch(editSlot({
      slotId: editing.id,
      edit: {
        startTime: draft.startTime,
        endTime: draft.endTime,
        type: draft.type,
        clinicId: draft.type === 'video' ? null : draft.clinicId,
      },
    }));
    if (editSlot.fulfilled.match(result)) setEditing(null);
  }, [dispatch, editing, draft]);

  // ── Grouping & counts ──
  const groups = useMemo(() => {
    const out: { key: string; title: string; icon: any; slots: DoctorSlot[] }[] = [];
    const video = slots.filter((s) => s.type === 'video');
    if (video.length) out.push({ key: 'video', title: 'Video consultations', icon: 'videocam-outline', slots: video });
    const byClinic = new Map<string, DoctorSlot[]>();
    slots.filter((s) => s.type === 'in-clinic').forEach((s) => {
      const k = s.clinic?.id ?? 'unknown';
      if (!byClinic.has(k)) byClinic.set(k, []);
      byClinic.get(k)!.push(s);
    });
    byClinic.forEach((list, k) => {
      out.push({ key: k, title: list[0].clinic?.name ?? 'Clinic', icon: 'business-outline', slots: list });
    });
    return out;
  }, [slots]);

  const counts = useMemo(() => {
    const c: Record<DoctorSlotState, number> = { open: 0, requested: 0, booked: 0, held: 0, blocked: 0, past: 0 };
    slots.forEach((s) => { c[s.state] += 1; });
    return c;
  }, [slots]);

  // ── Loading / error with nothing to show ──
  if (loading && slots.length === 0 && clinics.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={barStyleOn(THEME.gradient.primary[0])} backgroundColor={THEME.gradient.primary[0]} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.headerGradient}>
          <View style={styles.headerNav}>
            <BackButton tone="onAccent" onPress={() => navigation.goBack()} />
            <View style={styles.headerCenter}><Text style={styles.headerTitle}>Manage Time Slots</Text></View>
            <View style={styles.backButton} />
          </View>
        </LinearGradient>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Loading time slots…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && slots.length === 0 && clinics.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={barStyleOn(THEME.gradient.primary[0])} backgroundColor={THEME.gradient.primary[0]} />
        <LinearGradient colors={THEME.gradient.primary} style={styles.headerGradient}>
          <View style={styles.headerNav}>
            <BackButton tone="onAccent" onPress={() => navigation.goBack()} />
            <View style={styles.headerCenter}><Text style={styles.headerTitle}>Manage Time Slots</Text></View>
            <View style={styles.backButton} />
          </View>
        </LinearGradient>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={THEME.error} />
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

  // ── Render ──
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={barStyleOn(THEME.gradient.primary[0])} backgroundColor={THEME.gradient.primary[0]} />

      <LinearGradient colors={THEME.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
        <View style={styles.headerNav}>
          <BackButton tone="onAccent" onPress={() => navigation.goBack()} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Manage Time Slots</Text>
            <Text style={styles.headerSubtitle}>Add, edit and track your availability</Text>
          </View>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Date ── */}
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <View style={styles.cardLabelDot} />
            <Text style={styles.cardLabel}>Date</Text>
            <View style={styles.weekNav}>
              <TouchableOpacity onPress={handlePrevWeek} style={styles.weekNavBtn} accessibilityLabel="Previous week">
                <Ionicons name="chevron-back" size={18} color={THEME.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextWeek} style={styles.weekNavBtn} accessibilityLabel="Next week">
                <Ionicons name="chevron-forward" size={18} color={THEME.primary} />
              </TouchableOpacity>
            </View>
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
                  style={[styles.dateCell, isSelected && styles.dateCellSelected, isPast && styles.dateCellPast]}
                  onPress={() => !isPast && dispatch(setSelectedDate(dateStr))}
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
                  <Text style={[styles.dateDayName, isSelected && styles.dateDayNameSelected, isPast && styles.dateDimText]}>
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

        {/* ── Summary for the day ── */}
        <View style={styles.statsStrip}>
          {(['open', 'requested', 'booked'] as DoctorSlotState[]).map((k, i) => (
            <React.Fragment key={k}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: STATE_META[k].color }]}>{counts[k]}</Text>
                <Text style={[styles.statLabel, { color: STATE_META[k].color }]}>{STATE_META[k].label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ── Slots for the day ── */}
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <View style={styles.cardLabelDot} />
            <Text style={styles.cardLabel}>Your slots</Text>
            {loading && <ActivityIndicator size="small" color={THEME.primary} />}
          </View>

          {slots.length === 0 ? (
            <View style={styles.emptySlots}>
              <Ionicons name="time-outline" size={28} color={THEME.primary} />
              <Text style={styles.emptySlotsTitle}>No slots on this day</Text>
              <Text style={styles.emptySlotsSubtext}>
                Use “Add slots” below to open times patients can book.
              </Text>
            </View>
          ) : (
            <>
              {groups.map((g) => (
                <View key={g.key} style={styles.group}>
                  <View style={styles.groupHeader}>
                    <Ionicons name={g.icon} size={14} color={THEME.textLight} />
                    <Text style={styles.groupTitle} numberOfLines={1}>{g.title}</Text>
                    <Text style={styles.groupCount}>{g.slots.length}</Text>
                  </View>
                  <View style={styles.slotGrid}>
                    {g.slots.map((slot) => (
                      <SlotCell
                        key={slot.id}
                        slot={slot}
                        busy={busySlotId === slot.id}
                        onPress={setActionSlot}
                        styles={styles}
                      />
                    ))}
                  </View>
                </View>
              ))}
              <View style={styles.legend}>
                {(['open', 'requested', 'booked', 'held', 'blocked'] as DoctorSlotState[]).map((k) => (
                  <View key={k} style={styles.legendItem}>
                    <View style={[styles.legendSwatch, { backgroundColor: STATE_META[k].bg, borderColor: STATE_META[k].color }]} />
                    <Text style={styles.legendLabel}>{STATE_META[k].label}</Text>
                  </View>
                ))}
              </View>
              <Text style={msClinicStyles.hint}>Tap a slot to edit, close or delete it.</Text>
            </>
          )}
        </View>

        {/* ── Add slots ── */}
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <View style={styles.cardLabelDot} />
            <Text style={styles.cardLabel}>Add slots</Text>
          </View>

          <Text style={styles.subLabel}>Consultation type</Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((opt) => {
              const active = opt.value === newSlotType;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => dispatch(setNewSlotType(opt.value))}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons name={opt.icon} size={18} color={active ? THEME.primary : '#94A3B8'} />
                  <Text style={[styles.typeChipText, active && { color: THEME.primary }]}>{opt.label}</Text>
                  <Text style={styles.typeChipSub}>{opt.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Clinic — only when the slot happens at one. */}
          {needsClinic && (
            <>
              <View style={[styles.subLabelRow]}>
                <Text style={styles.subLabel}>Clinic</Text>
                <TouchableOpacity style={msClinicStyles.addBtn} onPress={() => setClinicFormVisible(true)} activeOpacity={0.8}>
                  <Ionicons name="add" size={14} color={THEME.primary} />
                  <Text style={msClinicStyles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
              {clinics.length === 0 ? (
                <View style={msClinicStyles.empty}>
                  <Ionicons name="business-outline" size={26} color={THEME.textLight} />
                  <Text style={msClinicStyles.emptyTitle}>No clinics yet</Text>
                  <Text style={msClinicStyles.emptyText}>Add a clinic to offer in-clinic visits.</Text>
                </View>
              ) : (
                <View style={styles.clinicList}>
                  {clinics.map((clinic) => {
                    const isActive = clinic.clinicId === selectedClinic;
                    return (
                      <TouchableOpacity
                        key={clinic.clinicId}
                        style={[styles.clinicCard, isActive && styles.clinicCardActive]}
                        onPress={() => dispatch(setSelectedClinic(clinic.clinicId))}
                        onLongPress={() => handleRemoveClinic(clinic)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="business-outline" size={18} color={isActive ? THEME.primary : THEME.textLight} />
                        <View style={styles.clinicInfo}>
                          <Text style={[styles.clinicName, isActive && { color: THEME.primary }]} numberOfLines={1}>
                            {clinic.name}
                          </Text>
                          <Text style={styles.clinicAddress} numberOfLines={1}>{clinic.address}</Text>
                        </View>
                        {isActive && <Ionicons name="checkmark-circle" size={20} color={THEME.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                  <Text style={msClinicStyles.hint}>Tap to choose · long-press to remove</Text>
                </View>
              )}
            </>
          )}

          <Text style={styles.subLabel}>Time range</Text>
          <View style={styles.rangeRow}>
            <TimeStepper
              label="From"
              value={rangeStart}
              min={0}
              max={RANGE_MAX - slotDuration}
              onChange={(v) => dispatch(setRangeStart(v))}
            />
            <TimeStepper
              label="To"
              value={rangeEnd}
              min={toMinutes(rangeStart) + slotDuration}
              max={RANGE_MAX}
              onChange={(v) => dispatch(setRangeEnd(v))}
            />
          </View>

          <Text style={styles.subLabel}>Slot length</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((opt) => {
              const isActive = opt.value === slotDuration;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.durationChip, isActive && styles.durationChipActive]}
                  onPress={() => dispatch(setSlotDuration(opt.value))}
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

          <Text style={styles.subLabel}>Patients per slot</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, maxPatientsPerSlot <= 1 && styles.stepperBtnDisabled]}
              onPress={() => dispatch(setMaxPatientsPerSlot(maxPatientsPerSlot - 1))}
              disabled={maxPatientsPerSlot <= 1}
            >
              <Ionicons name="remove" size={20} color={maxPatientsPerSlot <= 1 ? '#CBD5E1' : '#374151'} />
            </TouchableOpacity>
            <View style={styles.stepperValueBlock}>
              <Text style={styles.stepperValueNum}>{maxPatientsPerSlot}</Text>
              <Text style={styles.stepperValueLabel}>patient{maxPatientsPerSlot !== 1 ? 's' : ''}</Text>
            </View>
            <TouchableOpacity
              style={[styles.stepperBtn, maxPatientsPerSlot >= 10 && styles.stepperBtnDisabled]}
              onPress={() => dispatch(setMaxPatientsPerSlot(maxPatientsPerSlot + 1))}
              disabled={maxPatientsPerSlot >= 10}
            >
              <Ionicons name="add" size={20} color={maxPatientsPerSlot >= 10 ? '#CBD5E1' : '#374151'} />
            </TouchableOpacity>
          </View>

          {/* What will actually be created, before the doctor commits to it. */}
          <View style={styles.preview}>
            <Ionicons name="information-circle-outline" size={16} color={THEME.primary} />
            <Text style={styles.previewText}>
              {isPastDay
                ? 'This day has already passed.'
                : plannedTimes.length === 0
                  ? 'No slots fit this range — widen it or choose a later start.'
                  : needsClinic && !selectedClinic
                    ? 'Choose a clinic for in-clinic slots.'
                    : `${plannedCount} slot${plannedCount === 1 ? '' : 's'}: ${formatTime12(plannedTimes[0].startTime)} – ${formatTime12(plannedTimes[plannedTimes.length - 1].endTime)}` +
                      (newSlotType === 'both' ? ' · video + in-clinic at each time' : '') +
                      (needsClinic && selectedClinicName ? ` · ${selectedClinicName}` : '')}
            </Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Slot action sheet ── */}
      <Modal visible={!!actionSlot} transparent animationType="slide" onRequestClose={() => setActionSlot(null)}>
        <TouchableOpacity style={msClinicStyles.sheetOverlay} activeOpacity={1} onPress={() => setActionSlot(null)}>
          <TouchableOpacity activeOpacity={1} style={msClinicStyles.sheet}>
            {actionSlot && (
              <>
                <View style={msClinicStyles.sheetHandle} />
                <Text style={msClinicStyles.sheetTitle}>
                  {formatTime12(actionSlot.startTime)} – {formatTime12(actionSlot.endTime)}
                </Text>
                <Text style={msClinicStyles.sheetSub}>
                  {actionSlot.type === 'video' ? 'Video consultation' : `In-clinic · ${actionSlot.clinic?.name ?? 'Clinic'}`}
                  {'  ·  '}{STATE_META[actionSlot.state].label}
                  {actionSlot.state === 'requested' && `\nRequested by ${actionSlot.appointments.map((a) => a.patientName).join(', ')}. Nobody else can book it while you decide.`}
                  {actionSlot.state === 'booked' && `\nBooked by ${actionSlot.appointments.map((a) => a.patientName).join(', ')}.`}
                  {actionSlot.state === 'held' && actionSlot.heldBy &&
                    `\nUnavailable: you are booked for a ${typeLabel(actionSlot.heldBy.type)} consultation at ${formatTime12(actionSlot.heldBy.startTime)}, and cannot see two patients at once. It reopens automatically if that booking is cancelled.`}
                  {actionSlot.state === 'past' && '\nThis slot has already started.'}
                </Text>

                {actionSlot.canEdit && (
                  <TouchableOpacity style={msClinicStyles.actionRow} onPress={() => openEdit(actionSlot)}>
                    <View style={[msClinicStyles.actionIcon, { backgroundColor: THEME.primaryLight }]}>
                      <Ionicons name="create-outline" size={18} color={THEME.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={msClinicStyles.actionText}>Edit time or type</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {actionSlot.canEdit && actionSlot.state === 'open' && (
                  <TouchableOpacity
                    style={msClinicStyles.actionRow}
                    onPress={() => {
                      const s = actionSlot;
                      setActionSlot(null);
                      dispatch(editSlot({ slotId: s.id, edit: { status: 'blocked' }, notice: 'Slot closed to patients' }));
                    }}
                  >
                    <View style={[msClinicStyles.actionIcon, { backgroundColor: '#F1F5F9' }]}>
                      <Ionicons name="eye-off-outline" size={18} color="#64748B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={msClinicStyles.actionText}>Close slot</Text>
                      <Text style={msClinicStyles.actionSub}>Hide it from patients without deleting it</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {actionSlot.canEdit && actionSlot.state === 'blocked' && (
                  <TouchableOpacity
                    style={msClinicStyles.actionRow}
                    onPress={() => {
                      const s = actionSlot;
                      setActionSlot(null);
                      dispatch(editSlot({ slotId: s.id, edit: { status: 'available' }, notice: 'Slot reopened' }));
                    }}
                  >
                    <View style={[msClinicStyles.actionIcon, { backgroundColor: THEME.successLight }]}>
                      <Ionicons name="eye-outline" size={18} color={THEME.success} />
                    </View>
                    <Text style={msClinicStyles.actionText}>Reopen slot</Text>
                  </TouchableOpacity>
                )}

                {actionSlot.state === 'requested' &&
                  actionSlot.appointments
                    .filter((a) => a.status === 'pending')
                    .map((a) => (
                      <React.Fragment key={a.id}>
                        <TouchableOpacity
                          style={msClinicStyles.actionRow}
                          onPress={() => {
                            const target = actionSlot;
                            setActionSlot(null);
                            dispatch(respondToRequest({ slotId: target.id, appointmentId: a.id, approve: true }));
                          }}
                        >
                          <View style={[msClinicStyles.actionIcon, { backgroundColor: THEME.successLight }]}>
                            <Ionicons name="checkmark-circle-outline" size={18} color={THEME.success} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={msClinicStyles.actionText}>Approve {a.patientName}</Text>
                            <Text style={msClinicStyles.actionSub}>Confirms the appointment</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={msClinicStyles.actionRow}
                          onPress={() => {
                            const target = actionSlot;
                            setActionSlot(null);
                            Alert.alert(
                              'Decline request',
                              `Decline ${a.patientName}'s request? They will be refunded and notified, and the slot reopens for other patients.`,
                              [
                                { text: 'Keep', style: 'cancel' },
                                {
                                  text: 'Decline',
                                  style: 'destructive',
                                  onPress: () =>
                                    dispatch(respondToRequest({ slotId: target.id, appointmentId: a.id, approve: false })),
                                },
                              ],
                            );
                          }}
                        >
                          <View style={[msClinicStyles.actionIcon, { backgroundColor: THEME.errorLight }]}>
                            <Ionicons name="close-circle-outline" size={18} color={THEME.error} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[msClinicStyles.actionText, { color: THEME.error }]}>Decline {a.patientName}</Text>
                            <Text style={msClinicStyles.actionSub}>Refunds the patient and reopens the slot</Text>
                          </View>
                        </TouchableOpacity>
                      </React.Fragment>
                    ))}

                {actionSlot.state === 'booked' && (
                  <TouchableOpacity
                    style={msClinicStyles.actionRow}
                    onPress={() => {
                      setActionSlot(null);
                      navigation.navigate(DoctorRouteNames.DoctorTabs, { screen: 'Schedule' });
                    }}
                  >
                    <View style={[msClinicStyles.actionIcon, { backgroundColor: THEME.accentLight }]}>
                      <Ionicons name="calendar-outline" size={18} color={THEME.accent} />
                    </View>
                    <Text style={msClinicStyles.actionText}>Open my schedule</Text>
                  </TouchableOpacity>
                )}

                {actionSlot.canDelete && (
                  <TouchableOpacity style={msClinicStyles.actionRow} onPress={() => confirmDelete(actionSlot)}>
                    <View style={[msClinicStyles.actionIcon, { backgroundColor: THEME.errorLight }]}>
                      <Ionicons name="trash-outline" size={18} color={THEME.error} />
                    </View>
                    <Text style={[msClinicStyles.actionText, { color: THEME.error }]}>Delete slot</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={msClinicStyles.cancel} onPress={() => setActionSlot(null)}>
                  <Text style={msClinicStyles.cancelText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Edit slot ── */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={msClinicStyles.sheetOverlay}>
          <View style={msClinicStyles.sheet}>
            <View style={msClinicStyles.sheetHandle} />
            <Text style={msClinicStyles.sheetTitle}>Edit slot</Text>
            <Text style={msClinicStyles.sheetSub}>Only possible while nobody has booked it.</Text>

            <View style={styles.rangeRow}>
              <TimeStepper
                label="Start"
                value={draft.startTime}
                min={0}
                max={RANGE_MAX - 15}
                step={15}
                onChange={(v) => setDraft((d) => {
                  const len = toMinutes(d.endTime) - toMinutes(d.startTime);
                  return { ...d, startTime: v, endTime: fromMinutes(Math.min(toMinutes(v) + len, RANGE_MAX)) };
                })}
              />
              <TimeStepper
                label="End"
                value={draft.endTime}
                min={toMinutes(draft.startTime) + 15}
                max={RANGE_MAX}
                step={15}
                onChange={(v) => setDraft((d) => ({ ...d, endTime: v }))}
              />
            </View>

            <Text style={msClinicStyles.fieldLabel}>Type</Text>
            <View style={styles.typeRow}>
              {(['video', 'in-clinic'] as SlotKind[]).map((t) => {
                const active = draft.type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => setDraft((d) => ({ ...d, type: t, clinicId: d.clinicId ?? selectedClinic }))}
                  >
                    <Ionicons name={t === 'video' ? 'videocam-outline' : 'business-outline'} size={18} color={active ? THEME.primary : '#94A3B8'} />
                    <Text style={[styles.typeChipText, active && { color: THEME.primary }]}>{t === 'video' ? 'Video' : 'In-Clinic'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {draft.type === 'in-clinic' && (
              <>
                <Text style={msClinicStyles.fieldLabel}>Clinic</Text>
                <View style={styles.clinicList}>
                  {clinics.map((c) => {
                    const active = c.clinicId === draft.clinicId;
                    return (
                      <TouchableOpacity
                        key={c.clinicId}
                        style={[styles.clinicCard, active && styles.clinicCardActive]}
                        onPress={() => setDraft((d) => ({ ...d, clinicId: c.clinicId }))}
                      >
                        <Text style={[styles.clinicName, active && { color: THEME.primary }]} numberOfLines={1}>{c.name}</Text>
                        {active && <Ionicons name="checkmark-circle" size={18} color={THEME.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {!!actionError && <Text style={styles.inlineError}>{actionError}</Text>}

            <TouchableOpacity
              style={[msClinicStyles.submit, draft.type === 'in-clinic' && !draft.clinicId && msClinicStyles.submitDisabled]}
              disabled={busySlotId === editing?.id || (draft.type === 'in-clinic' && !draft.clinicId)}
              onPress={saveEdit}
              activeOpacity={0.9}
            >
              <LinearGradient colors={THEME.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={msClinicStyles.submitGradient} />
              {busySlotId === editing?.id
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={msClinicStyles.submitText}>Save changes</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={msClinicStyles.cancel} onPress={() => { setEditing(null); dispatch(clearMessages()); }}>
              <Text style={msClinicStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Add Clinic ── */}
      <Modal visible={clinicFormVisible} transparent animationType="slide" onRequestClose={() => setClinicFormVisible(false)}>
        <View style={msClinicStyles.sheetOverlay}>
          <View style={msClinicStyles.sheet}>
            <View style={msClinicStyles.sheetHandle} />
            <Text style={msClinicStyles.sheetTitle}>Add a clinic</Text>
            <Text style={msClinicStyles.sheetSub}>Patients see this location when they book an in-clinic visit.</Text>

            <Text style={msClinicStyles.fieldLabel}>Clinic name</Text>
            <TextInput
              style={msClinicStyles.input}
              value={clinicForm.name}
              onChangeText={(t) => setClinicForm((f) => ({ ...f, name: t }))}
              placeholder="e.g. City Heart Clinic"
              placeholderTextColor="#94A3B8"
            />
            <Text style={msClinicStyles.fieldLabel}>Address</Text>
            <TextInput
              style={msClinicStyles.input}
              value={clinicForm.address}
              onChangeText={(t) => setClinicForm((f) => ({ ...f, address: t }))}
              placeholder="e.g. 12-A, Main Boulevard, Gulberg III"
              placeholderTextColor="#94A3B8"
            />
            <Text style={msClinicStyles.fieldLabel}>City</Text>
            <TextInput
              style={msClinicStyles.input}
              value={clinicForm.city}
              onChangeText={(t) => setClinicForm((f) => ({ ...f, city: t }))}
              placeholder="e.g. Lahore"
              placeholderTextColor="#94A3B8"
            />
            <Text style={msClinicStyles.fieldLabel}>Phone (optional)</Text>
            <TextInput
              style={msClinicStyles.input}
              value={clinicForm.phone}
              onChangeText={(t) => setClinicForm((f) => ({ ...f, phone: t }))}
              placeholder="e.g. 042-35761234"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={[msClinicStyles.submit, !canSubmitClinic && msClinicStyles.submitDisabled]}
              disabled={!canSubmitClinic || clinicSaving}
              onPress={handleSubmitClinic}
              activeOpacity={0.9}
            >
              {canSubmitClinic && (
                <LinearGradient colors={THEME.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={msClinicStyles.submitGradient} />
              )}
              {clinicSaving
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={msClinicStyles.submitText}>Add clinic</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={msClinicStyles.cancel} onPress={() => setClinicFormVisible(false)}>
              <Text style={msClinicStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Bottom bar ── */}
      <View style={styles.bottomBar}>
        {!!notice && (
          <View style={styles.noticeBanner}>
            <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}
        {!!actionError && !editing && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={15} color={THEME.error} />
            <Text style={styles.errorBannerText}>{actionError}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.saveButton, !canCreate && styles.saveButtonDisabled]}
          onPress={handleCreate}
          disabled={!canCreate}
          activeOpacity={0.85}
        >
          {canCreate ? (
            <LinearGradient colors={THEME.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveButtonGradient}>
              {creating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Add {plannedCount} slot{plannedCount === 1 ? '' : 's'}</Text>
                </>
              )}
            </LinearGradient>
          ) : (
            <View style={styles.saveButtonGradient}>
              <Ionicons name="add-circle-outline" size={20} color="#94A3B8" />
              <Text style={[styles.saveButtonText, { color: '#94A3B8' }]}>
                {creating ? 'Adding…' : 'Add slots'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ManageSlotsScreen;

// ── Styles ─────────────────────────────────────

const SLOT_COLUMNS = 3;
const SLOT_GAP = 8;

const makeStyles = (sh: DarkShift) => StyleSheet.create({
  container: { flex: 1, backgroundColor: sh.n('#F8FBFF', 'bg') },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 10 },
  loadingText: { fontSize: 15, fontWeight: '600', color: sh.n('#64748B', 'inkMuted') },
  errorTitle: { fontSize: 18, fontWeight: '700', color: sh.n('#0F172A', 'ink') },
  errorSubtext: { fontSize: 14, fontWeight: '500', color: sh.n('#94A3B8', 'inkFaint'), textAlign: 'center', marginBottom: 6 },
  retryBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  retryBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14 },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  headerGradient: { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0, paddingBottom: 14 },
  headerNav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.75)', marginTop: 1 },

  scrollContent: { padding: 20, paddingBottom: 40 },

  card: {
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: sh.n('#F1F5F9', 'lineSoft'),
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  cardLabelDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.primary },
  cardLabel: {
    fontSize: 13, fontWeight: '700', color: sh.n('#64748B', 'inkMuted'),
    textTransform: 'uppercase', letterSpacing: 0.6, flex: 1,
  },
  subLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  subLabel: {
    fontSize: 12, fontWeight: '700', color: sh.n('#64748B', 'inkMuted'),
    marginTop: 16, marginBottom: 8,
  },
  weekNav: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  weekNavBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: THEME.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },

  clinicList: { gap: 8 },
  clinicCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: sh.n('#F8FBFF', 'bg'),
    borderRadius: 14, padding: 12, gap: 12, borderWidth: 1.5, borderColor: sh.n('#E2E8F0', 'line'),
  },
  clinicCardActive: { borderColor: THEME.primary, backgroundColor: sh.ground('#F0F7FF', '#2A7FFF') },
  clinicInfo: { flex: 1 },
  clinicName: { fontSize: 14, fontWeight: '700', color: sh.n('#0F172A', 'ink'), flex: 1 },
  clinicAddress: { fontSize: 12, fontWeight: '500', color: sh.n('#94A3B8', 'inkFaint'), marginTop: 2 },

  dateStrip: { flexDirection: 'row', gap: 6 },
  dateCell: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12,
    backgroundColor: sh.n('#F8FBFF', 'bg'), borderWidth: 1, borderColor: sh.n('#E2E8F0', 'line'),
    overflow: 'hidden', gap: 2,
  },
  dateCellSelected: { borderColor: 'transparent' },
  dateCellPast: { opacity: 0.4 },
  dateDayName: {
    fontSize: 9, fontWeight: '700', color: sh.n('#94A3B8', 'inkFaint'),
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  dateDayNameSelected: { color: 'rgba(255,255,255,0.85)' },
  dateDayNumber: { fontSize: 16, fontWeight: '800', color: sh.n('#0F172A', 'ink') },
  dateDayNumberSelected: { color: '#FFFFFF' },
  dateDimText: { color: sh.n('#CBD5E1', 'disabled') },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: THEME.primary },

  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12,
    backgroundColor: sh.n('#F8FBFF', 'bg'), borderWidth: 1.5, borderColor: sh.n('#E2E8F0', 'line'), gap: 2,
  },
  typeChipActive: { borderColor: THEME.primary, backgroundColor: sh.ground('#F0F7FF', '#2A7FFF') },
  typeChipText: { fontSize: 13, fontWeight: '800', color: sh.hue('#374151') },
  typeChipSub: { fontSize: 10, fontWeight: '600', color: sh.n('#94A3B8', 'inkFaint') },

  rangeRow: { flexDirection: 'row', gap: 10 },

  durationRow: { flexDirection: 'row', gap: 10 },
  durationChip: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 13,
    backgroundColor: sh.n('#F8FBFF', 'bg'), borderWidth: 1.5, borderColor: sh.n('#E2E8F0', 'line'),
    overflow: 'hidden', gap: 2,
  },
  durationChipActive: { borderColor: 'transparent' },
  durationNum: { fontSize: 18, fontWeight: '800', color: sh.hue('#374151'), letterSpacing: -0.4 },
  durationSub: {
    fontSize: 10, fontWeight: '700', color: sh.n('#94A3B8', 'inkFaint'),
    textTransform: 'uppercase', letterSpacing: 0.3,
  },

  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24,
    backgroundColor: sh.n('#F8FBFF', 'bg'), borderRadius: 14, paddingVertical: 12,
  },
  stepperBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: sh.n('#FFFFFF', 'surface'),
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: sh.n('#E2E8F0', 'line'),
  },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperValueBlock: { alignItems: 'center', minWidth: 56 },
  stepperValueNum: { fontSize: 26, fontWeight: '800', color: THEME.primary, letterSpacing: -1 },
  stepperValueLabel: {
    fontSize: 11, fontWeight: '700', color: sh.n('#94A3B8', 'inkFaint'),
    textTransform: 'uppercase', letterSpacing: 0.3,
  },

  preview: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 16,
    backgroundColor: sh.ground('#F0F7FF', '#2A7FFF'), borderRadius: 10, padding: 12,
  },
  previewText: { flex: 1, fontSize: 13, fontWeight: '600', color: sh.n('#1E3A5F', 'ink'), lineHeight: 18 },

  statsStrip: {
    flexDirection: 'row', borderRadius: 10, padding: 14, marginBottom: 14, alignItems: 'center',
    backgroundColor: sh.n('#FFFFFF', 'surface'), borderWidth: 1, borderColor: sh.n('#F1F5F9', 'lineSoft'),
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  statDivider: { width: 1, height: 30, backgroundColor: sh.n('#E2E8F0', 'line') },

  group: { marginBottom: 14 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  groupTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: sh.n('#0F172A', 'ink') },
  groupCount: { fontSize: 12, fontWeight: '700', color: sh.n('#94A3B8', 'inkFaint') },

  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SLOT_GAP },
  slotCell: {
    // A percentage of a flex-wrapped row; the gap is absorbed by rounding down.
    width: `${Math.floor((100 - 4 * (SLOT_COLUMNS - 1)) / SLOT_COLUMNS)}%`,
    minHeight: 74, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1.5, gap: 3,
  },
  slotTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  slotTypeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.2 },
  slotTime: { fontSize: 12.5, fontWeight: '800', letterSpacing: -0.2 },
  slotStateRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  slotStateText: { fontSize: 10, fontWeight: '800' },

  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3, borderWidth: 1.5 },
  legendLabel: { fontSize: 11, fontWeight: '600', color: sh.n('#64748B', 'inkMuted') },

  emptySlots: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptySlotsTitle: { fontSize: 15, fontWeight: '700', color: sh.hue('#374151') },
  emptySlotsSubtext: { fontSize: 13, fontWeight: '500', color: sh.n('#94A3B8', 'inkFaint'), textAlign: 'center' },

  inlineError: { marginTop: 12, fontSize: 13, fontWeight: '600', color: THEME.error },

  bottomBar: {
    backgroundColor: sh.n('#FFFFFF', 'surface'),
    borderTopWidth: 1,
    borderTopColor: sh.n('#F1F5F9', 'lineSoft'),
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  noticeBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: THEME.success,
  },
  noticeText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', flexShrink: 1 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: THEME.errorLight,
  },
  errorBannerText: { fontSize: 13, fontWeight: '600', color: THEME.error, flexShrink: 1 },
  saveButton: {
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: THEME.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 5 },
    }),
  },
  saveButtonDisabled: { backgroundColor: sh.n('#F1F5F9', 'lineSoft'), elevation: 0 },
  saveButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.2 },
});
