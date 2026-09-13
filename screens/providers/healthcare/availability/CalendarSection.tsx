import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import ActionSheet, { SheetOption } from '../../../../components/ui/ActionSheet';
import {
  Button,
  Card,
  Chip,
  DateField,
  EmptyState,
  ErrorState,
  FormSheet,
  TimeField,
  ToneBadge,
  showToast,
} from '../../../../components/ui';
import { GUTTER, R, S, SECTION, T } from '../../../../constants/theme';
import type {
  AvailabilityHub,
  CalendarDay,
  CalendarSlot,
  CalendarSummaryDay,
  OneOffResult,
  SkippedTime,
} from '../../../../models/healthcare/doctorHub';
import { DoctorRouteNames } from '../../../../navigation-maps/Healthcare';
import {
  blockCalendarDay,
  createOneOffSlots,
  deleteCalendarSlot,
  fetchCalendarDay,
  fetchCalendarSummary,
  setSlotBlocked,
  unblockCalendarDay,
} from '../../../../networks/healthcare/doctorHubApi';
import { ThemeColors, useTheme } from '../../../../theme';
import {
  appointmentStatusMeta,
  consultationLabel,
  dateFromKey,
  formatDateLabel,
  formatDayHeading,
  formatMonthYear,
  formatTimeRange,
  slotStateMeta,
  uses24HourClock,
  WEEKDAYS_SHORT,
} from '../../../../utils/healthcare/doctorFormat';
import {
  addDaysToKey,
  mondayOf,
  todayDateKey,
  toMinutes,
  weekOf,
} from '../../../../utils/healthcare/timeRanges';

// ============================================================================
// The calendar: any day's actual slots, and what can be done with each.
//
// Replaces Manage Slots, which could only reach seven days either side, set
// times with ±30-minute steppers, and — against the server it shipped with —
// showed every slot as "Open" with no way to close or delete anything.
// ============================================================================

interface Props {
  hub: AvailabilityHub;
  initialDate?: string;
  onOpenTimeOff: () => void;
  onChanged: () => void;
}

const SKIP_REASON: Record<string, string> = {
  PAST_OR_TOO_SOON: 'Already past or too soon to book',
  OVERLAPS_EXISTING: 'Overlaps a slot you already have',
  OVERLAPS_OTHER_CLINIC: 'Overlaps in-clinic hours at another clinic',
};

const isDateKey = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !!dateFromKey(v);

// ── Add hours ───────────────────────────────────────────────────

const AddHoursSheet: React.FC<{
  visible: boolean;
  date: string;
  hub: AvailabilityHub;
  onClose: () => void;
  onCreated: (result: OneOffResult) => void;
}> = ({ visible, date, hub, onClose, onCreated }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const videoOn = hub.settings.videoConsultation;
  const duration = hub.settings.slotDuration;

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [type, setType] = useState<'video' | 'in-clinic' | 'both'>('in-clinic');
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [patients, setPatients] = useState(1);
  const [split, setSplit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<SkippedTime[]>([]);

  useEffect(() => {
    if (!visible) return;
    setStart('');
    setEnd('');
    setType(hub.clinics.length ? 'in-clinic' : 'video');
    setClinicId(hub.clinics[0]?.id ?? null);
    setPatients(1);
    setSplit(true);
    setError(null);
    setSkipped([]);
  }, [visible, hub.clinics]);

  const s = toMinutes(start);
  const e = toMinutes(end);
  const needsClinic = type !== 'video';
  let problem: string | null = null;
  if (s === null || e === null) problem = 'Choose a start and end time';
  else if (e <= s) problem = 'The end time must be after the start time';
  else if (split && e - s < duration) problem = `Shorter than one ${duration}-minute slot`;
  else if (needsClinic && !clinicId) problem = 'Choose a clinic';

  const kinds = type === 'both' ? 2 : 1;
  const count = s !== null && e !== null && e > s ? (split ? Math.floor((e - s) / duration) : 1) * kinds : 0;

  const submit = async () => {
    if (problem) return;
    setSaving(true);
    setError(null);
    setSkipped([]);
    const res = await createOneOffSlots({
      date,
      startTime: start,
      endTime: end,
      type,
      clinicId: needsClinic ? clinicId : null,
      split,
      maxPatients: patients,
    });
    setSaving(false);
    if (res.success) {
      onCreated(res.data);
      return;
    }
    setError(res.message || "We couldn't add these hours");
    if (Array.isArray(res.errorData?.skipped)) setSkipped(res.errorData.skipped);
  };

  return (
    <FormSheet
      visible={visible}
      title="Add hours"
      subtitle={`One-off hours on ${formatDateLabel(date, { weekday: true, year: false })}. Your weekly hours don't change.`}
      onClose={onClose}
      busy={saving}
      footer={
        <Button
          label={count ? `Add ${count} slot${count === 1 ? '' : 's'}` : 'Add hours'}
          onPress={submit}
          loading={saving}
          disabled={!!problem}
        />
      }
    >
      <View style={styles.timeRow}>
        <TimeField label="From" value={start} onChange={setStart} minuteInterval={5} style={styles.flex} />
        <View style={styles.timeGap} />
        <TimeField label="To" value={end} onChange={setEnd} minuteInterval={5} style={styles.flex} />
      </View>

      <Text style={styles.label}>Consultation</Text>
      <View style={styles.chips}>
        <Chip label="In-clinic" icon="business-outline" selected={type === 'in-clinic'} onPress={() => setType('in-clinic')} style={styles.chip} />
        <Chip
          label="Video"
          icon="videocam-outline"
          selected={type === 'video'}
          disabled={!videoOn}
          onPress={() => setType('video')}
          style={styles.chip}
        />
        <Chip label="Both" selected={type === 'both'} disabled={!videoOn} onPress={() => setType('both')} style={styles.chip} />
      </View>
      {!videoOn && <Text style={styles.caption}>Video is switched off in booking settings.</Text>}

      {needsClinic && (
        <>
          <Text style={styles.label}>Clinic</Text>
          {hub.clinics.length === 0 ? (
            <Text style={styles.caption}>Add a clinic under Weekly hours first.</Text>
          ) : (
            <View style={styles.chips}>
              {hub.clinics.map((c) => (
                <Chip key={c.id} label={c.name} selected={clinicId === c.id} onPress={() => setClinicId(c.id)} style={styles.chip} />
              ))}
            </View>
          )}
        </>
      )}

      <Text style={styles.label}>Patients per slot</Text>
      <View style={styles.chips}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip key={n} label={String(n)} selected={patients === n} onPress={() => setPatients(n)} style={styles.chip} />
        ))}
      </View>

      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <Text style={styles.strong}>Split into {duration}-minute slots</Text>
          <Text style={styles.caption}>{split ? 'One patient per slot' : 'The whole period is one slot'}</Text>
        </View>
        <Switch
          value={split}
          onValueChange={setSplit}
          trackColor={{ false: colors.line, true: colors.accentSoft }}
          thumbColor={split ? colors.accent : colors.inkFaint}
          ios_backgroundColor={colors.line}
          accessibilityLabel={`Split into ${duration}-minute slots`}
        />
      </View>

      {(start || end) && !!problem && <Text style={styles.problem}>{problem}</Text>}
      {!!error && <Text style={styles.problem}>{error}</Text>}
      {skipped.map((item, i) => (
        <Text key={`${item.type}-${item.startTime}-${i}`} style={styles.caption}>
          {consultationLabel(item.type)} {item.startTime}–{item.endTime}: {SKIP_REASON[item.reason] || item.reason}
        </Text>
      ))}
    </FormSheet>
  );
};

// ── Section ─────────────────────────────────────────────────────

const CalendarSection: React.FC<Props> = ({ hub, initialDate, onOpenTimeOff, onChanged }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const uses24h = useMemo(uses24HourClock, []);
  const today = todayDateKey();

  const [selected, setSelected] = useState(isDateKey(initialDate) ? (initialDate as string) : today);
  const [weekStart, setWeekStart] = useState(mondayOf(selected));
  const [summary, setSummary] = useState<Record<string, CalendarSummaryDay>>({});
  const [day, setDay] = useState<CalendarDay | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);
  const [slotSheet, setSlotSheet] = useState<CalendarSlot | null>(null);
  const [confirmDay, setConfirmDay] = useState<'block' | 'unblock' | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpDate, setJumpDate] = useState(selected);
  const latestDayRequest = useRef(0);

  const loadSummary = useCallback(async (start: string) => {
    const res = await fetchCalendarSummary(start, addDaysToKey(start, 6));
    if (!res.success) return;
    setSummary((prev) => {
      const next = { ...prev };
      res.data.forEach((d) => {
        next[d.date] = d;
      });
      return next;
    });
  }, []);

  const loadDay = useCallback(async (date: string) => {
    // A slow response for a day the doctor has already moved past must not
    // replace the day now on screen.
    const request = ++latestDayRequest.current;
    setDayLoading(true);
    setDayError(null);
    const res = await fetchCalendarDay(date);
    if (request !== latestDayRequest.current) return;
    setDayLoading(false);
    if (res.success) setDay(res.data);
    else setDayError(res.message || "We couldn't load this day");
  }, []);

  useEffect(() => {
    loadSummary(weekStart);
  }, [weekStart, loadSummary]);

  useEffect(() => {
    loadDay(selected);
  }, [selected, loadDay]);

  const refresh = () => {
    loadDay(selected);
    loadSummary(weekStart);
    onChanged();
  };

  const selectDate = (key: string) => {
    setSelected(key);
    const monday = mondayOf(key);
    if (monday !== weekStart) setWeekStart(monday);
  };

  const shiftWeek = (weeks: number) => {
    const start = addDaysToKey(weekStart, weeks * 7);
    setWeekStart(start);
    setSelected(weekOf(start).includes(today) ? today : start);
  };

  // ── Actions ──
  const runSlot = async (slot: CalendarSlot, action: 'block' | 'unblock' | 'delete') => {
    if (action === 'delete') {
      const res = await deleteCalendarSlot(slot.id);
      if (!res.success) {
        showToast({ message: res.message || "We couldn't delete this slot", tone: 'error' });
        return;
      }
      showToast({ message: res.data.outcome === 'closed' ? 'Slot closed' : 'Slot deleted', tone: 'success' });
    } else {
      const res = await setSlotBlocked(slot.id, action);
      if (!res.success) {
        showToast({ message: res.message || "That didn't work. Try again.", tone: 'error' });
        return;
      }
      showToast({ message: action === 'block' ? 'Slot closed' : 'Slot reopened', tone: 'success' });
    }
    refresh();
  };

  const runDay = async (action: 'block' | 'unblock') => {
    if (action === 'block') {
      const res = await blockCalendarDay(selected);
      if (!res.success) {
        showToast({ message: res.message || "We couldn't close this day", tone: 'error' });
        return;
      }
      showToast({
        message: `Closed ${res.data.blocked} slot${res.data.blocked === 1 ? '' : 's'}${
          res.data.bookedKept ? ` · ${res.data.bookedKept} booked appointment${res.data.bookedKept === 1 ? '' : 's'} kept` : ''
        }`,
        tone: 'success',
      });
    } else {
      const res = await unblockCalendarDay(selected);
      if (!res.success) {
        showToast({ message: res.message || "We couldn't reopen this day", tone: 'error' });
        return;
      }
      showToast({ message: `Reopened ${res.data.unblocked} slot${res.data.unblocked === 1 ? '' : 's'}`, tone: 'success' });
    }
    refresh();
  };

  const slotOptions = (slot: CalendarSlot): SheetOption[] => {
    const options: SheetOption[] = slot.appointments.map((a) => ({
      label: `${a.patientName}'s appointment`,
      icon: 'person-outline',
      description: appointmentStatusMeta(a.status).label,
      onPress: () => navigation.navigate(DoctorRouteNames.AppointmentDetail, { appointmentId: a.id }),
    }));
    if (slot.canBlock) {
      options.push({
        label: 'Close this slot',
        icon: 'lock-closed-outline',
        description: "Patients won't be able to book it",
        onPress: () => runSlot(slot, 'block'),
      });
    }
    if (slot.canUnblock) {
      options.push({ label: 'Reopen this slot', icon: 'lock-open-outline', onPress: () => runSlot(slot, 'unblock') });
    }
    if (slot.canDelete) {
      options.push({ label: 'Delete this slot', icon: 'trash-outline', tone: 'destructive', onPress: () => runSlot(slot, 'delete') });
    }
    return options;
  };

  const slotMessage = (slot: CalendarSlot): string | undefined => {
    if (slot.isPast) return 'This slot has already started.';
    if (slot.blockedBy === 'time_off') return 'Closed for your time off.';
    if (slot.blockedBy === 'template') return "No longer in your weekly hours. It stays closed so its booking isn't lost.";
    if (slot.state === 'held') return "Unavailable: you're booked at an overlapping time.";
    if (slot.source === 'template' && slot.state === 'open') return 'From your weekly hours.';
    return undefined;
  };

  // ── Render helpers ──
  const summaryLine = (d: CalendarDay) =>
    [
      d.summary.open ? `${d.summary.open} open` : '',
      d.summary.requested ? `${d.summary.requested} request${d.summary.requested === 1 ? '' : 's'}` : '',
      d.summary.booked ? `${d.summary.booked} booked` : '',
      d.summary.blocked + d.summary.held ? `${d.summary.blocked + d.summary.held} closed` : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'No slots';

  const groups = useMemo(() => {
    const byKey = new Map<string, CalendarSlot[]>();
    (day?.slots ?? []).forEach((slot) => {
      const key = slot.type === 'video' ? 'Video' : slot.clinic?.name || 'In-clinic';
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(slot);
    });
    return [...byKey.entries()];
  }, [day]);

  const dayForSelected = day && day.date === selected ? day : null;

  const renderDay = () => {
    if (!dayForSelected) {
      if (dayError) return <ErrorState message={dayError} onRetry={() => loadDay(selected)} />;
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      );
    }
    const d = dayForSelected;
    const canEditDay = !d.isPast && !d.timeOff;

    return (
      <>
        {d.timeOff && (
          <Card style={styles.block} accentRule={colors.warning}>
            <Text style={styles.strong}>Time off{d.timeOff.reason ? `: ${d.timeOff.reason}` : ''}</Text>
            <Text style={styles.caption}>
              {formatDateLabel(d.timeOff.from, { weekday: false })} – {formatDateLabel(d.timeOff.to, { weekday: false, year: true })}.
              Patients can't book these days.
            </Text>
            <Button label="Manage time off" variant="ghost" size="sm" fullWidth={false} onPress={onOpenTimeOff} style={styles.inlineButton} />
          </Card>
        )}

        {canEditDay && (
          <View style={styles.dayActions}>
            <Button label="Add hours" icon="add" size="sm" variant="secondary" fullWidth={false} onPress={() => setAddOpen(true)} />
            {d.summary.open + d.summary.held > 0 && (
              <Button
                label="Close day"
                icon="lock-closed-outline"
                size="sm"
                variant="secondary"
                fullWidth={false}
                onPress={() => setConfirmDay('block')}
                style={styles.actionGap}
              />
            )}
            {d.slots.some((slot) => slot.canUnblock) && (
              <Button
                label="Reopen closed"
                icon="lock-open-outline"
                size="sm"
                variant="ghost"
                fullWidth={false}
                onPress={() => setConfirmDay('unblock')}
                style={styles.actionGap}
              />
            )}
          </View>
        )}

        {d.slots.length === 0 ? (
          <Card>
            <EmptyState
              icon="calendar-clear-outline"
              title="No slots on this day"
              message={
                d.isPast
                  ? 'This day has passed.'
                  : d.timeOff
                    ? 'You have time off.'
                    : 'Add one-off hours, or turn this weekday on in Weekly hours.'
              }
              actionLabel={canEditDay ? 'Add hours' : undefined}
              onAction={canEditDay ? () => setAddOpen(true) : undefined}
            />
          </Card>
        ) : (
          groups.map(([name, slots]) => (
            <View key={name} style={styles.group}>
              <Text style={styles.groupTitle}>{name}</Text>
              <Card padded={false} style={styles.listCard}>
                {slots.map((slot, i) => {
                  const meta = slotStateMeta(slot.state);
                  const who = slot.appointments.map((a) => a.patientName).join(', ');
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[styles.slotRow, i > 0 && styles.divider]}
                      onPress={() => setSlotSheet(slot)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${formatTimeRange(slot.startTime, slot.endTime, uses24h)}, ${meta.label}${who ? `, ${who}` : ''}`}
                    >
                      <View style={styles.flex}>
                        <Text style={[styles.strong, slot.isPast && styles.faded]}>
                          {formatTimeRange(slot.startTime, slot.endTime, uses24h)}
                        </Text>
                        {!!who && (
                          <Text style={styles.caption} numberOfLines={1}>
                            {who}
                          </Text>
                        )}
                        {slot.maxPatients > 1 && (
                          <Text style={styles.caption}>
                            {slot.bookedCount} of {slot.maxPatients} booked
                          </Text>
                        )}
                      </View>
                      <ToneBadge label={meta.label} tone={meta.tone} />
                      <Ionicons name="ellipsis-horizontal" size={18} color={colors.inkFaint} style={styles.more} />
                    </TouchableOpacity>
                  );
                })}
              </Card>
            </View>
          ))
        )}
      </>
    );
  };

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={dayLoading && !!dayForSelected} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} />
        }
      >
        <View style={styles.monthRow}>
          <TouchableOpacity
            onPress={() => shiftWeek(-1)}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Previous week"
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setJumpDate(selected);
              setJumpOpen(true);
            }}
            style={styles.monthButton}
            accessibilityRole="button"
            accessibilityLabel={`${formatMonthYear(selected)}. Go to a date`}
          >
            <Text style={styles.month}>{formatMonthYear(selected)}</Text>
            <Ionicons name="calendar-outline" size={16} color={colors.inkMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => shiftWeek(1)}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Next week"
          >
            <Ionicons name="chevron-forward" size={22} color={colors.ink} />
          </TouchableOpacity>
          {selected !== today && (
            <Button label="Today" size="sm" variant="ghost" fullWidth={false} onPress={() => selectDate(today)} />
          )}
        </View>

        <View style={styles.strip}>
          {weekOf(weekStart).map((key) => {
            const date = dateFromKey(key);
            const info = summary[key];
            const isSelected = key === selected;
            const dot = info?.timeOff
              ? colors.inkFaint
              : info?.requested
                ? colors.warning
                : info?.open
                  ? colors.success
                  : 'transparent';
            return (
              <TouchableOpacity
                key={key}
                onPress={() => selectDate(key)}
                style={[styles.pill, isSelected && styles.pillSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${formatDateLabel(key)}${info ? `, ${info.open} open${info.requested ? `, ${info.requested} requests` : ''}` : ''}`}
              >
                <Text style={[styles.pillWeekday, isSelected && styles.pillTextSelected]}>
                  {date ? WEEKDAYS_SHORT[date.getDay()] : ''}
                </Text>
                <Text
                  style={[
                    styles.pillDate,
                    key === today && styles.pillToday,
                    isSelected && styles.pillTextSelected,
                  ]}
                >
                  {date?.getDate()}
                </Text>
                <View style={[styles.pillDot, { backgroundColor: dot }]} />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{formatDayHeading(selected, today)}</Text>
          {dayForSelected && <Text style={styles.caption}>{summaryLine(dayForSelected)}</Text>}
        </View>

        {renderDay()}
        <View style={styles.bottomSpace} />
      </ScrollView>

      <ActionSheet
        visible={!!slotSheet}
        title={slotSheet ? formatTimeRange(slotSheet.startTime, slotSheet.endTime, uses24h) : undefined}
        message={slotSheet ? slotMessage(slotSheet) : undefined}
        options={slotSheet ? slotOptions(slotSheet) : []}
        cancelLabel="Done"
        onClose={() => setSlotSheet(null)}
      />

      <ActionSheet
        visible={!!confirmDay}
        title={
          confirmDay === 'block'
            ? `Close ${formatDateLabel(selected)}?`
            : `Reopen slots you closed on ${formatDateLabel(selected)}?`
        }
        message={
          confirmDay === 'block'
            ? "Open slots close so patients can't book them. Booked appointments stay booked."
            : 'Slots closed for time off or old weekly hours stay closed.'
        }
        options={[
          confirmDay === 'block'
            ? { label: 'Close day', icon: 'lock-closed-outline', tone: 'destructive', onPress: () => runDay('block') }
            : { label: 'Reopen slots', icon: 'lock-open-outline', onPress: () => runDay('unblock') },
        ]}
        onClose={() => setConfirmDay(null)}
      />

      <AddHoursSheet
        visible={addOpen}
        date={selected}
        hub={hub}
        onClose={() => setAddOpen(false)}
        onCreated={(result) => {
          setAddOpen(false);
          const added = result.created.length;
          showToast({
            message: `Added ${added} slot${added === 1 ? '' : 's'}${
              result.skipped.length ? ` · ${result.skipped.length} skipped` : ''
            }`,
            tone: 'success',
          });
          refresh();
        }}
      />

      <FormSheet
        visible={jumpOpen}
        title="Go to a date"
        onClose={() => setJumpOpen(false)}
        scrollable={false}
        footer={
          <Button
            label="Go"
            onPress={() => {
              selectDate(jumpDate);
              setJumpOpen(false);
            }}
          />
        }
      >
        <DateField label="Date" value={jumpDate} onChange={setJumpDate} />
      </FormSheet>
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: GUTTER, paddingTop: S.md },
    label: { ...T.label, color: c.inkMuted, marginTop: S.lg, marginBottom: S.sm },
    caption: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    strong: { ...T.bodyStrong, color: c.ink },
    faded: { color: c.inkMuted },
    problem: { ...T.caption, color: c.error, marginTop: S.md },
    chips: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: { marginRight: S.sm, marginBottom: S.sm },
    timeRow: { flexDirection: 'row' },
    timeGap: { width: S.md },
    switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: S.lg },
    monthRow: { flexDirection: 'row', alignItems: 'center' },
    iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    monthButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44 },
    month: { ...T.subhead, color: c.ink, marginRight: S.xs },
    strip: { flexDirection: 'row', marginTop: S.sm },
    pill: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: S.sm,
      marginHorizontal: 2,
      borderRadius: R.control,
      minHeight: 64,
    },
    pillSelected: { backgroundColor: c.accentSoft },
    pillWeekday: { ...T.caption, color: c.inkMuted },
    pillDate: { ...T.subhead, color: c.ink, marginTop: 2 },
    pillToday: { color: c.accentDeep },
    pillTextSelected: { color: c.accentDeep },
    pillDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
    dayHeader: { marginTop: SECTION, marginBottom: S.md },
    dayTitle: { ...T.heading, color: c.ink },
    dayActions: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: S.md },
    actionGap: { marginLeft: S.sm },
    block: { marginBottom: S.md },
    inlineButton: { marginTop: S.sm, alignSelf: 'flex-start' },
    loading: { paddingVertical: S.huge, alignItems: 'center' },
    group: { marginBottom: S.lg },
    groupTitle: { ...T.label, color: c.inkMuted, marginBottom: S.sm },
    listCard: { paddingHorizontal: S.lg },
    slotRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: S.sm },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    more: { marginLeft: S.sm },
    bottomSpace: { height: S.huge * 2 },
  });

export default CalendarSection;
