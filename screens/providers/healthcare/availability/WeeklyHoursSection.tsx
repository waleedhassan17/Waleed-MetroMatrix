import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ActionSheet, { SheetOption } from '../../../../components/ui/ActionSheet';
import {
  Button,
  Card,
  Chip,
  FormSheet,
  ListRow,
  SectionHeader,
  TimeField,
  showToast,
} from '../../../../components/ui';
import { E, GUTTER, R, S, SECTION, T } from '../../../../constants/theme';
import type { AvailabilityHub, BookingSettings, HubClinic, PlanPreview } from '../../../../models/healthcare/doctorHub';
import { applyWeeklyHours, previewWeeklyHours } from '../../../../networks/healthcare/doctorHubApi';
import { ThemeColors, useTheme } from '../../../../theme';
import {
  consultationLabel,
  formatDateLabel,
  formatTimeRange,
  uses24HourClock,
} from '../../../../utils/healthcare/doctorFormat';
import {
  DayMode,
  EditableDay,
  RangeIssue,
  TimeRange,
  Weekday,
  WEEKDAYS,
  slotsInRange,
  suggestNextRange,
  toServerWeek,
  validateWeek,
  weeklySlotCount,
} from '../../../../utils/healthcare/timeRanges';
import ClinicSheet from './ClinicSheet';

// ============================================================================
// Weekly hours: the template patients book from.
//
// Save does not write blindly. It previews what the new hours would do to the
// slots already published — how many open slots appear and disappear, and which
// BOOKED appointments fall outside the new hours — and only then applies. Booked
// appointments are never cancelled by changing hours; they are listed so the
// doctor can deal with each one.
// ============================================================================

const DURATIONS = [10, 15, 20, 30, 45, 60];
const BUFFERS = [0, 5, 10, 15];
const MAX_APPLY_ROUNDS = 5;

interface Props {
  hub: AvailabilityHub;
  week: EditableDay[];
  settings: BookingSettings;
  dirty: boolean;
  onWeekChange: (week: EditableDay[]) => void;
  onSettingsChange: (settings: BookingSettings) => void;
  onDiscard: () => void;
  onApplied: () => void;
  onClinicAdded: (clinic: HubClinic) => void;
  onReloadHub: () => void;
}

// ── Pieces ──────────────────────────────────────────────────────

const PeriodRow: React.FC<{
  range: TimeRange;
  mode: DayMode;
  clinicName?: string;
  issues: RangeIssue[];
  onChange: (patch: Partial<TimeRange>) => void;
  onRemove: () => void;
  onPickClinic: () => void;
}> = ({ range, mode, clinicName, issues, onChange, onRemove, onPickClinic }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.period}>
      <View style={styles.periodTimes}>
        <TimeField
          value={range.startTime}
          onChange={(v) => onChange({ startTime: v })}
          placeholder="Start"
          minuteInterval={5}
          style={styles.timeField}
        />
        <Text style={styles.dash}>–</Text>
        <TimeField
          value={range.endTime}
          onChange={(v) => onChange({ endTime: v })}
          placeholder="End"
          minuteInterval={5}
          style={styles.timeField}
        />
        <TouchableOpacity
          onPress={onRemove}
          style={styles.remove}
          accessibilityRole="button"
          accessibilityLabel="Remove this period"
        >
          <Ionicons name="trash-outline" size={18} color={colors.inkMuted} />
        </TouchableOpacity>
      </View>
      {mode === 'onsite' && (
        <TouchableOpacity
          onPress={onPickClinic}
          style={styles.clinicPick}
          accessibilityRole="button"
          accessibilityLabel={`Clinic: ${clinicName || 'not chosen'}`}
        >
          <Ionicons name="business-outline" size={16} color={clinicName ? colors.accentDeep : colors.warning} />
          <Text style={[styles.clinicPickText, !clinicName && { color: colors.warning }]} numberOfLines={1}>
            {clinicName || 'Choose a clinic'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.inkFaint} />
        </TouchableOpacity>
      )}
      {issues.map((issue) => (
        <Text key={issue.code} style={styles.issue} accessibilityLiveRegion="polite">
          {issue.message}
        </Text>
      ))}
    </View>
  );
};

const ModeBlock: React.FC<{
  day: EditableDay;
  mode: DayMode;
  settings: BookingSettings;
  clinicsById: Map<string, HubClinic>;
  issues: RangeIssue[];
  onToggle: (on: boolean) => void;
  onRangeChange: (index: number, patch: Partial<TimeRange>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onPickClinic: (index: number) => void;
}> = ({ day, mode, settings, clinicsById, issues, onToggle, onRangeChange, onAdd, onRemove, onPickClinic }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const block = day[mode];
  const videoOff = mode === 'online' && !settings.videoConsultation;
  const count = block.ranges.reduce((n, r) => n + slotsInRange(r, settings.slotDuration, settings.bufferMinutes), 0);

  return (
    <View style={styles.mode}>
      <View style={styles.modeHeader}>
        <Ionicons
          name={mode === 'online' ? 'videocam-outline' : 'business-outline'}
          size={18}
          color={block.enabled && !videoOff ? colors.accentDeep : colors.inkFaint}
        />
        <View style={styles.modeText}>
          <Text style={styles.modeTitle}>{mode === 'online' ? 'Video' : 'In-clinic'}</Text>
          {block.enabled && !videoOff && <Text style={styles.caption}>{count} slots</Text>}
        </View>
        <Switch
          value={block.enabled && !videoOff}
          disabled={videoOff}
          onValueChange={onToggle}
          trackColor={{ false: colors.line, true: colors.accentSoft }}
          thumbColor={block.enabled && !videoOff ? colors.accent : colors.inkFaint}
          ios_backgroundColor={colors.line}
          accessibilityLabel={`${day.day} ${mode === 'online' ? 'video' : 'in-clinic'} hours`}
        />
      </View>
      {videoOff && <Text style={styles.caption}>Video consultations are switched off in booking settings.</Text>}
      {block.enabled && !videoOff && (
        <>
          {block.ranges.map((range, index) => (
            <PeriodRow
              key={`${mode}-${index}`}
              range={range}
              mode={mode}
              clinicName={range.clinicId ? clinicsById.get(range.clinicId)?.name : undefined}
              issues={issues.filter((i) => i.mode === mode && i.index === index)}
              onChange={(patch) => onRangeChange(index, patch)}
              onRemove={() => onRemove(index)}
              onPickClinic={() => onPickClinic(index)}
            />
          ))}
          <TouchableOpacity
            onPress={onAdd}
            style={styles.addPeriod}
            accessibilityRole="button"
            accessibilityLabel={`Add a ${mode === 'online' ? 'video' : 'in-clinic'} period on ${day.day}`}
          >
            <Ionicons name="add" size={18} color={colors.accentDeep} />
            <Text style={styles.addPeriodText}>{block.ranges.length ? 'Add another period' : 'Add a period'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const PreviewStat: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.previewStat}>
      <Text style={styles.previewValue}>{value}</Text>
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
};

// ── Section ─────────────────────────────────────────────────────

const WeeklyHoursSection: React.FC<Props> = ({
  hub,
  week,
  settings,
  dirty,
  onWeekChange,
  onSettingsChange,
  onDiscard,
  onApplied,
  onClinicAdded,
  onReloadHub,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const uses24h = useMemo(uses24HourClock, []);

  const clinicsById = useMemo(() => new Map(hub.clinics.map((c) => [c.id, c])), [hub.clinics]);
  const { issuesByDay, warningsByDay, hasErrors } = useMemo(
    () => validateWeek(week, { slotDuration: settings.slotDuration }),
    [week, settings.slotDuration]
  );
  const weekly = weeklySlotCount(week, settings.slotDuration, settings.bufferMinutes, {
    videoEnabled: settings.videoConsultation,
  });

  const [clinicTarget, setClinicTarget] = useState<{ day: Weekday; index: number } | null>(null);
  const [clinicSheet, setClinicSheet] = useState<{ assignTo: { day: Weekday; index: number } | null } | null>(null);
  const [copySource, setCopySource] = useState<Weekday | null>(null);
  const [copyTargets, setCopyTargets] = useState<Weekday[]>([]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [changedElsewhere, setChangedElsewhere] = useState(false);
  const [applying, setApplying] = useState(false);

  const firstClinicId = hub.clinics[0]?.id ?? null;

  // ── Editing ──
  const updateDay = (dayName: Weekday, fn: (d: EditableDay) => EditableDay) =>
    onWeekChange(week.map((d) => (d.day === dayName ? fn(d) : d)));

  const withRange = (mode: DayMode, ranges: TimeRange[]) => ({ enabled: true, ranges });

  const toggleWorking = (dayName: Weekday, on: boolean) =>
    updateDay(dayName, (d) => {
      if (!on) return { ...d, isWorking: false };
      if (d.online.ranges.length || d.onsite.ranges.length) return { ...d, isWorking: true };
      // A sensible first period, so switching a day on is one tap, not four.
      if (firstClinicId) {
        return { ...d, isWorking: true, onsite: withRange('onsite', [{ startTime: '09:00', endTime: '13:00', clinicId: firstClinicId }]) };
      }
      if (settings.videoConsultation) {
        return { ...d, isWorking: true, online: withRange('online', [{ startTime: '09:00', endTime: '13:00', clinicId: null }]) };
      }
      return { ...d, isWorking: true };
    });

  const toggleMode = (dayName: Weekday, mode: DayMode, on: boolean) =>
    updateDay(dayName, (d) => {
      const block = d[mode];
      if (!on) return { ...d, [mode]: { ...block, enabled: false } };
      if (block.ranges.length) return { ...d, [mode]: { ...block, enabled: true } };
      const next = suggestNextRange([], settings.slotDuration);
      const ranges = next ? [{ ...next, clinicId: mode === 'onsite' ? firstClinicId : null }] : [];
      return { ...d, [mode]: { enabled: true, ranges } };
    });

  const changeRange = (dayName: Weekday, mode: DayMode, index: number, patch: Partial<TimeRange>) =>
    updateDay(dayName, (d) => ({
      ...d,
      [mode]: { ...d[mode], ranges: d[mode].ranges.map((r, i) => (i === index ? { ...r, ...patch } : r)) },
    }));

  const addRange = (dayName: Weekday, mode: DayMode) => {
    const day = week.find((d) => d.day === dayName);
    if (!day) return;
    const next = suggestNextRange(day[mode].ranges, settings.slotDuration);
    if (!next) {
      showToast({ message: `No room left on ${dayName} for another period`, tone: 'neutral' });
      return;
    }
    const lastClinic = day[mode].ranges[day[mode].ranges.length - 1]?.clinicId ?? firstClinicId;
    updateDay(dayName, (d) => ({
      ...d,
      [mode]: { ...d[mode], ranges: [...d[mode].ranges, { ...next, clinicId: mode === 'onsite' ? lastClinic : null }] },
    }));
  };

  const removeRange = (dayName: Weekday, mode: DayMode, index: number) =>
    updateDay(dayName, (d) => {
      const ranges = d[mode].ranges.filter((_, i) => i !== index);
      return { ...d, [mode]: { enabled: ranges.length > 0 && d[mode].enabled, ranges } };
    });

  const applyCopy = () => {
    const source = week.find((d) => d.day === copySource);
    if (!source) return;
    const clone = (d: EditableDay): EditableDay => ({
      ...d,
      isWorking: source.isWorking,
      online: { enabled: source.online.enabled, ranges: source.online.ranges.map((r) => ({ ...r })) },
      onsite: { enabled: source.onsite.enabled, ranges: source.onsite.ranges.map((r) => ({ ...r })) },
    });
    onWeekChange(week.map((d) => (copyTargets.includes(d.day) ? clone(d) : d)));
    showToast({ message: `Copied ${copySource} to ${copyTargets.length} day${copyTargets.length === 1 ? '' : 's'}`, tone: 'success' });
    setCopySource(null);
    setCopyTargets([]);
  };

  const clinicOptions: SheetOption[] = clinicTarget
    ? [
        ...hub.clinics.map((c) => ({
          label: c.name,
          icon: 'business-outline',
          description: [c.address, c.city].filter(Boolean).join(', '),
          onPress: () => changeRange(clinicTarget.day, 'onsite', clinicTarget.index, { clinicId: c.id }),
        })),
        {
          label: 'Add a clinic',
          icon: 'add',
          onPress: () => setClinicSheet({ assignTo: clinicTarget }),
        },
      ]
    : [];

  // ── Save ──
  const payloadSettings = {
    slotDuration: settings.slotDuration,
    bufferMinutes: settings.bufferMinutes,
    videoConsultation: settings.videoConsultation,
    autoConfirm: settings.autoConfirm,
  };

  const openPreview = async () => {
    setPreviewOpen(true);
    setPreview(null);
    setPreviewError(null);
    setChangedElsewhere(false);
    setPreviewLoading(true);
    const res = await previewWeeklyHours({ weeklyAvailability: toServerWeek(week), settings: payloadSettings });
    setPreviewLoading(false);
    if (res.success) setPreview(res.data);
    else setPreviewError(res.message || "We couldn't check these hours. Try again.");
  };

  const apply = async () => {
    setApplying(true);
    let base = preview?.baseVersion ?? hub.version;
    let added = 0;
    let removed = 0;
    let finished = false;
    for (let round = 0; round < MAX_APPLY_ROUNDS; round += 1) {
      const res = await applyWeeklyHours({
        baseVersion: base,
        weeklyAvailability: toServerWeek(week),
        settings: payloadSettings,
      });
      if (!res.success) {
        setApplying(false);
        if (res.code === 'TEMPLATE_CHANGED') setChangedElsewhere(true);
        else setPreviewError(res.message || "We couldn't save your weekly hours. Try again.");
        return;
      }
      added += res.data.summary.added;
      removed += res.data.summary.removed;
      base = res.data.version;
      // A large change is applied in rounds; the same request finishes it.
      if (!res.data.partial) {
        finished = true;
        break;
      }
    }
    setApplying(false);
    setPreviewOpen(false);
    const details = [added ? `${added} added` : '', removed ? `${removed} removed` : ''].filter(Boolean).join(' · ');
    showToast({
      message: finished
        ? `Weekly hours saved${details ? ` · ${details}` : ''}`
        : 'Weekly hours saved. Some slots are still updating — check the calendar shortly.',
      tone: 'success',
    });
    onApplied();
  };

  // ── Render ──
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {hub.verificationStatus && hub.verificationStatus !== 'verified' && (
          <Card style={styles.notice}>
            <ListRow
              icon="shield-outline"
              tone="accent"
              title="Your profile is being reviewed"
              subtitle="Set your hours now. Patients can book them once you're verified."
            />
          </Card>
        )}

        <Card>
          <Text style={styles.summary}>{weekly} slots a week</Text>
          <Text style={styles.caption}>
            Patients can book up to {formatDateLabel(hub.horizon.through, { weekday: false, year: true })}. New days are
            added automatically.
          </Text>
        </Card>

        <SectionHeader title="Booking settings" style={styles.section} />
        <Card>
          <Text style={styles.label}>Consultation length</Text>
          <View style={styles.chips}>
            {DURATIONS.map((minutes) => (
              <Chip
                key={minutes}
                label={`${minutes} min`}
                selected={settings.slotDuration === minutes}
                onPress={() => onSettingsChange({ ...settings, slotDuration: minutes })}
                style={styles.chip}
              />
            ))}
          </View>
          <Text style={[styles.label, styles.labelGap]}>Break after each patient</Text>
          <View style={styles.chips}>
            {BUFFERS.map((minutes) => (
              <Chip
                key={minutes}
                label={minutes ? `${minutes} min` : 'None'}
                selected={settings.bufferMinutes === minutes}
                onPress={() => onSettingsChange({ ...settings, bufferMinutes: minutes })}
                style={styles.chip}
              />
            ))}
          </View>
          <ListRow
            title="Video consultations"
            subtitle="Offer video slots in your weekly hours"
            divider
            right={
              <Switch
                value={settings.videoConsultation}
                onValueChange={(v) => onSettingsChange({ ...settings, videoConsultation: v })}
                trackColor={{ false: colors.line, true: colors.accentSoft }}
                thumbColor={settings.videoConsultation ? colors.accent : colors.inkFaint}
                ios_backgroundColor={colors.line}
                accessibilityLabel="Video consultations"
              />
            }
          />
          <ListRow
            title="Approve bookings automatically"
            subtitle={
              settings.autoConfirm
                ? 'Bookings are confirmed straight away'
                : 'You approve each request before it is confirmed'
            }
            divider
            right={
              <Switch
                value={settings.autoConfirm}
                onValueChange={(v) => onSettingsChange({ ...settings, autoConfirm: v })}
                trackColor={{ false: colors.line, true: colors.accentSoft }}
                thumbColor={settings.autoConfirm ? colors.accent : colors.inkFaint}
                ios_backgroundColor={colors.line}
                accessibilityLabel="Approve bookings automatically"
              />
            }
          />
        </Card>

        <SectionHeader
          title="Clinics"
          actionLabel="Add clinic"
          onAction={() => setClinicSheet({ assignTo: null })}
          style={styles.section}
        />
        <Card>
          {hub.clinics.length === 0 ? (
            <Text style={styles.body}>Add a clinic to offer in-clinic hours. Video hours don't need one.</Text>
          ) : (
            hub.clinics.map((c, i) => (
              <ListRow
                key={c.id}
                icon="business-outline"
                title={c.name}
                subtitle={[c.address, c.city].filter(Boolean).join(', ')}
                divider={i > 0}
              />
            ))
          )}
        </Card>

        <SectionHeader title="Days" style={styles.section} />
        {WEEKDAYS.map((dayName) => {
          const day = week.find((d) => d.day === dayName);
          if (!day) return null;
          const issues = issuesByDay[dayName] ?? [];
          const warnings = warningsByDay[dayName] ?? [];
          const count = weeklySlotCount([day], settings.slotDuration, settings.bufferMinutes, {
            videoEnabled: settings.videoConsultation,
          });
          return (
            <Card key={dayName} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={styles.flex}>
                  <Text style={styles.dayName}>{dayName}</Text>
                  <Text style={styles.caption}>{day.isWorking ? `${count} slots` : 'Day off'}</Text>
                </View>
                {day.isWorking && (
                  <TouchableOpacity
                    onPress={() => {
                      setCopySource(dayName);
                      setCopyTargets([]);
                    }}
                    style={styles.copy}
                    accessibilityRole="button"
                    accessibilityLabel={`Copy ${dayName}'s hours to other days`}
                  >
                    <Text style={styles.copyText}>Copy to…</Text>
                  </TouchableOpacity>
                )}
                <Switch
                  value={day.isWorking}
                  onValueChange={(on) => toggleWorking(dayName, on)}
                  trackColor={{ false: colors.line, true: colors.accentSoft }}
                  thumbColor={day.isWorking ? colors.accent : colors.inkFaint}
                  ios_backgroundColor={colors.line}
                  accessibilityLabel={`Working on ${dayName}`}
                />
              </View>
              {day.isWorking && (
                <>
                  {(['onsite', 'online'] as DayMode[]).map((mode) => (
                    <ModeBlock
                      key={mode}
                      day={day}
                      mode={mode}
                      settings={settings}
                      clinicsById={clinicsById}
                      issues={issues}
                      onToggle={(on) => toggleMode(dayName, mode, on)}
                      onRangeChange={(index, patch) => changeRange(dayName, mode, index, patch)}
                      onAdd={() => addRange(dayName, mode)}
                      onRemove={(index) => removeRange(dayName, mode, index)}
                      onPickClinic={(index) => setClinicTarget({ day: dayName, index })}
                    />
                  ))}
                  {warnings.map((w) => (
                    <Text key={w} style={styles.warning}>
                      {w}
                    </Text>
                  ))}
                </>
              )}
            </Card>
          );
        })}

        <View style={{ height: dirty ? 140 : S.huge }} />
      </ScrollView>

      {dirty && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + S.md }]}>
          {hasErrors && <Text style={styles.footerError}>Fix the highlighted periods to save.</Text>}
          <View style={styles.footerRow}>
            <Button label="Discard" variant="secondary" fullWidth={false} onPress={onDiscard} />
            <Button
              label="Review changes"
              fullWidth={false}
              onPress={openPreview}
              disabled={hasErrors}
              style={styles.footerPrimary}
            />
          </View>
        </View>
      )}

      <ActionSheet
        visible={!!clinicTarget}
        title="Where are these hours held?"
        options={clinicOptions}
        onClose={() => setClinicTarget(null)}
      />

      <ClinicSheet
        visible={!!clinicSheet}
        onClose={() => setClinicSheet(null)}
        onSaved={(clinic) => {
          onClinicAdded(clinic);
          const target = clinicSheet?.assignTo;
          if (target) changeRange(target.day, 'onsite', target.index, { clinicId: clinic.id });
        }}
      />

      <FormSheet
        visible={!!copySource}
        title={`Copy ${copySource ?? ''}`}
        subtitle="Replace these days' hours with the same periods, modes and clinics."
        onClose={() => setCopySource(null)}
        footer={
          <Button
            label={copyTargets.length ? `Copy to ${copyTargets.length} day${copyTargets.length === 1 ? '' : 's'}` : 'Choose days'}
            disabled={!copyTargets.length}
            onPress={applyCopy}
          />
        }
      >
        <View style={styles.chips}>
          {WEEKDAYS.filter((d) => d !== copySource).map((d) => (
            <Chip
              key={d}
              label={d}
              selected={copyTargets.includes(d)}
              onPress={() =>
                setCopyTargets((t) => (t.includes(d) ? t.filter((x) => x !== d) : [...t, d]))
              }
              style={styles.chip}
            />
          ))}
        </View>
      </FormSheet>

      <FormSheet
        visible={previewOpen}
        title="Review changes"
        subtitle={`From today to ${formatDateLabel(preview?.window.through || hub.horizon.through, { weekday: false, year: true })}`}
        onClose={() => setPreviewOpen(false)}
        busy={applying}
        footer={
          changedElsewhere ? (
            <Button
              label="Load the latest hours"
              variant="secondary"
              onPress={() => {
                setPreviewOpen(false);
                setChangedElsewhere(false);
                onReloadHub();
              }}
            />
          ) : (
            <Button label="Apply changes" loading={applying} disabled={!preview || previewLoading} onPress={apply} />
          )
        }
      >
        {previewLoading ? (
          <View style={styles.previewLoading}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.body}>Checking your calendar…</Text>
          </View>
        ) : changedElsewhere ? (
          <Text style={styles.body}>
            Your weekly hours were changed on another device. Load the latest version, then make your change again.
          </Text>
        ) : previewError ? (
          <Text style={styles.errorText}>{previewError}</Text>
        ) : preview ? (
          <>
            <View style={styles.previewStats}>
              <PreviewStat value={`+${preview.summary.add}`} label="New slots" />
              <PreviewStat value={`−${preview.summary.remove}`} label="Open slots removed" />
              <PreviewStat value={String(preview.summary.keep)} label="Unchanged" />
            </View>
            {preview.summary.add === 0 && preview.summary.remove === 0 && (
              <Text style={styles.body}>No slots change. Your settings will be saved.</Text>
            )}
            {preview.conflicts.length > 0 && (
              <View style={styles.conflicts}>
                <Text style={styles.sheetHeading}>
                  {preview.conflicts.length} booked appointment{preview.conflicts.length === 1 ? '' : 's'} fall outside the
                  new hours
                </Text>
                <Text style={styles.body}>
                  They stay booked, and those times close so no one else can book them. Open an appointment from the
                  calendar to reschedule or cancel it.
                </Text>
                {preview.conflicts.map((c) => (
                  <View key={c.appointmentId} style={styles.conflictRow}>
                    <Text style={styles.strong}>{c.patientName}</Text>
                    <Text style={styles.caption}>
                      {[formatDateLabel(c.date), formatTimeRange(c.startTime, c.endTime, uses24h), consultationLabel(c.type)]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {preview.summary.skipped > 0 && (
              <Text style={styles.caption}>
                {preview.summary.skipped} time{preview.summary.skipped === 1 ? ' was' : 's were'} left out because they
                overlap slots you added by hand.
              </Text>
            )}
            {preview.warnings.map((w) => (
              <Text key={`${w.day}-${w.message}`} style={styles.warning}>
                {w.message}
              </Text>
            ))}
          </>
        ) : null}
      </FormSheet>
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: GUTTER, paddingTop: S.lg },
    section: { marginTop: SECTION },
    notice: { marginBottom: S.lg },
    summary: { ...T.subhead, color: c.ink },
    caption: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    body: { ...T.body, color: c.inkMuted },
    strong: { ...T.bodyStrong, color: c.ink },
    label: { ...T.label, color: c.inkMuted, marginBottom: S.sm },
    labelGap: { marginTop: S.lg },
    chips: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: { marginRight: S.sm, marginBottom: S.sm },
    dayCard: { marginBottom: S.md },
    dayHeader: { flexDirection: 'row', alignItems: 'center' },
    dayName: { ...T.subhead, color: c.ink },
    copy: { paddingHorizontal: S.sm, minHeight: 44, justifyContent: 'center', marginRight: S.xs },
    copyText: { ...T.label, color: c.accentDeep },
    mode: { marginTop: S.lg, paddingTop: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    modeHeader: { flexDirection: 'row', alignItems: 'center' },
    modeText: { flex: 1, marginLeft: S.sm },
    modeTitle: { ...T.bodyStrong, color: c.ink },
    period: { marginTop: S.md },
    periodTimes: { flexDirection: 'row', alignItems: 'center' },
    timeField: { flex: 1 },
    dash: { ...T.body, color: c.inkMuted, marginHorizontal: S.sm },
    remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: S.xs },
    clinicPick: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 40,
      marginTop: S.sm,
      paddingHorizontal: S.md,
      borderRadius: R.control,
      backgroundColor: c.surfaceSunken,
    },
    clinicPickText: { ...T.label, color: c.ink, flex: 1, marginHorizontal: S.sm },
    issue: { ...T.caption, color: c.error, marginTop: S.xs },
    warning: { ...T.caption, color: c.warning, marginTop: S.md },
    addPeriod: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginTop: S.xs },
    addPeriodText: { ...T.label, color: c.accentDeep, marginLeft: S.xs },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: GUTTER,
      paddingTop: S.md,
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      ...E.overlay,
    },
    footerError: { ...T.caption, color: c.error, marginBottom: S.sm },
    footerRow: { flexDirection: 'row' },
    footerPrimary: { flex: 1, marginLeft: S.sm },
    previewLoading: { alignItems: 'center', paddingVertical: S.xl, gap: S.md },
    previewStats: { flexDirection: 'row', marginBottom: S.lg },
    previewStat: { flex: 1, alignItems: 'center' },
    previewValue: { ...T.heading, color: c.ink },
    conflicts: { marginBottom: S.lg },
    sheetHeading: { ...T.subhead, color: c.ink, marginBottom: S.xs },
    conflictRow: {
      paddingVertical: S.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      marginTop: S.sm,
    },
    errorText: { ...T.body, color: c.error },
  });

export default WeeklyHoursSection;
