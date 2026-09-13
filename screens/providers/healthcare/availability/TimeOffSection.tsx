import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ActionSheet from '../../../../components/ui/ActionSheet';
import {
  Button,
  Card,
  DateField,
  EmptyState,
  FormSheet,
  TextField,
  ToneBadge,
  showToast,
} from '../../../../components/ui';
import { GUTTER, R, S, T } from '../../../../constants/theme';
import type { AvailabilityHub, ScheduleConflict, TimeOffEntry, TimeOffPreview } from '../../../../models/healthcare/doctorHub';
import { createTimeOff, deleteTimeOff, previewTimeOff } from '../../../../networks/healthcare/doctorHubApi';
import { ThemeColors, useTheme } from '../../../../theme';
import {
  consultationLabel,
  formatDateLabel,
  formatTimeRange,
  uses24HourClock,
} from '../../../../utils/healthcare/doctorFormat';
import { addDaysToKey, todayDateKey } from '../../../../utils/healthcare/timeRanges';

// ============================================================================
// Time off: leave as date ranges, with a reason.
//
// It replaces a form with "YYYY-MM-DD" text boxes that lost focus on every
// keystroke — and what saving it did: every appointment on the new days was
// cancelled on the spot, with no refund and no warning. Now the doctor sees the
// appointments inside the dates first, and chooses to keep them or to cancel
// and refund them.
// ============================================================================

interface Props {
  hub: AvailabilityHub;
  onChanged: () => void;
}

type Step = 'dates' | 'review';

const ConflictList: React.FC<{ conflicts: ScheduleConflict[] }> = ({ conflicts }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const uses24h = useMemo(uses24HourClock, []);
  return (
    <View style={styles.conflicts}>
      {conflicts.map((c) => (
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
  );
};

const Choice: React.FC<{ selected: boolean; title: string; subtitle: string; onPress: () => void }> = ({
  selected,
  title,
  subtitle,
  onPress,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
      activeOpacity={0.75}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? colors.accentDeep : colors.inkFaint}
      />
      <View style={styles.choiceText}>
        <Text style={styles.strong}>{title}</Text>
        <Text style={styles.caption}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
};

const TimeOffSection: React.FC<Props> = ({ hub, onChanged }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const today = todayDateKey();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('dates');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [preview, setPreview] = useState<TimeOffPreview | null>(null);
  const [onConflict, setOnConflict] = useState<'keep' | 'cancel'>('keep');
  const [working, setWorking] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TimeOffEntry | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep('dates');
    setFrom('');
    setTo('');
    setReason('');
    setSubmitted(false);
    setPreview(null);
    setOnConflict('keep');
    setSheetError(null);
  }, [open]);

  const dateError = !from || !to ? 'Choose a start and end date' : to < from ? 'The end date must be on or after the start' : null;

  const review = async () => {
    setSubmitted(true);
    if (dateError) return;
    setWorking(true);
    setSheetError(null);
    const res = await previewTimeOff(from, to);
    setWorking(false);
    if (!res.success) {
      setSheetError(res.message || "We couldn't check these dates");
      return;
    }
    if (res.data.overlapsExisting) {
      setSheetError('You already have time off during these dates. Remove it first, or choose other dates.');
      return;
    }
    setPreview(res.data);
    setStep('review');
  };

  const save = async () => {
    if (!preview) return;
    setWorking(true);
    setSheetError(null);
    const res = await createTimeOff({
      from,
      to,
      reason: reason.trim(),
      onConflict: preview.conflicts.length ? onConflict : 'keep',
      confirmAppointmentIds: onConflict === 'cancel' ? preview.conflicts.map((c) => c.appointmentId) : [],
    });
    setWorking(false);

    if (!res.success) {
      if (res.code === 'CONFLICTS_CHANGED' && Array.isArray(res.errorData?.conflicts)) {
        // New bookings arrived since the preview. Show the current list.
        setPreview((p) => (p ? { ...p, conflicts: res.errorData.conflicts } : p));
        setSheetError('The appointments in these dates just changed. Review them again.');
        return;
      }
      setSheetError(res.message || "We couldn't add this time off");
      return;
    }

    const { cancelled, failed, pendingCancellations } = res.data;
    const parts = [`Time off added · ${res.data.blockedSlots} slot${res.data.blockedSlots === 1 ? '' : 's'} closed`];
    if (cancelled.length) parts.push(`${cancelled.length} cancelled and refunded`);
    showToast({ message: parts.join(' · '), tone: 'success' });
    if (failed.length || pendingCancellations.length) {
      showToast({
        message: `${failed.length + pendingCancellations.length} appointment(s) still need cancelling. Open them from the calendar.`,
        tone: 'error',
      });
    }
    setOpen(false);
    onChanged();
  };

  const remove = async (entry: TimeOffEntry) => {
    const res = await deleteTimeOff(entry.id);
    if (!res.success) {
      showToast({ message: res.message || "We couldn't remove this time off", tone: 'error' });
      return;
    }
    showToast({ message: 'Time off removed. Those days are bookable again.', tone: 'success' });
    onChanged();
  };

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <Button label="Add time off" icon="add" onPress={() => setOpen(true)} />

        {hub.timeOff.length === 0 ? (
          <Card style={styles.section}>
            <EmptyState
              icon="airplane-outline"
              title="No time off planned"
              message="Add leave so patients can't book those days."
            />
          </Card>
        ) : (
          hub.timeOff.map((entry) => (
            <Card key={entry.id} style={styles.section}>
              <View style={styles.entry}>
                <View style={styles.flex}>
                  <Text style={styles.strong}>
                    {entry.from === entry.to
                      ? formatDateLabel(entry.from, { weekday: true, year: true })
                      : `${formatDateLabel(entry.from, { weekday: false })} – ${formatDateLabel(entry.to, { weekday: false, year: true })}`}
                  </Text>
                  <Text style={styles.caption}>
                    {entry.days} day{entry.days === 1 ? '' : 's'}
                    {entry.reason ? ` · ${entry.reason}` : ''}
                  </Text>
                  {entry.from <= today && entry.to >= today && (
                    <ToneBadge label="On leave now" tone="warning" style={styles.badge} />
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setRemoveTarget(entry)}
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel="Remove this time off"
                >
                  <Ionicons name="trash-outline" size={20} color={colors.inkMuted} />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>

      <ActionSheet
        visible={!!removeTarget}
        title="Remove this time off?"
        message="Those days reopen from your weekly hours and patients can book them again."
        options={[
          {
            label: 'Remove time off',
            icon: 'trash-outline',
            tone: 'destructive',
            onPress: () => removeTarget && remove(removeTarget),
          },
        ]}
        onClose={() => setRemoveTarget(null)}
      />

      <FormSheet
        visible={open}
        title={step === 'dates' ? 'Add time off' : 'Before you save'}
        subtitle={
          step === 'review' && preview
            ? `${preview.days} day${preview.days === 1 ? '' : 's'} · ${preview.slotsToBlock} slot${preview.slotsToBlock === 1 ? '' : 's'} will close`
            : undefined
        }
        onClose={() => setOpen(false)}
        busy={working}
        footer={
          step === 'dates' ? (
            <Button label="Continue" onPress={review} loading={working} />
          ) : (
            <View style={styles.footerRow}>
              <Button label="Back" variant="secondary" fullWidth={false} onPress={() => setStep('dates')} disabled={working} />
              <Button
                label={onConflict === 'cancel' && preview?.conflicts.length ? 'Save and cancel' : 'Save time off'}
                variant={onConflict === 'cancel' && preview?.conflicts.length ? 'destructive' : 'primary'}
                fullWidth={false}
                loading={working}
                onPress={save}
                style={styles.footerPrimary}
              />
            </View>
          )
        }
      >
        {step === 'dates' ? (
          <>
            <DateField
              label="From"
              value={from}
              min={today}
              max={addDaysToKey(today, 365)}
              onChange={(v) => {
                setFrom(v);
                if (!to || to < v) setTo(v);
              }}
              style={styles.field}
            />
            <DateField
              label="To"
              value={to}
              min={from || today}
              max={addDaysToKey(today, 365)}
              onChange={setTo}
              error={submitted ? dateError : null}
              style={styles.field}
            />
            <TextField
              label="Reason (optional)"
              value={reason}
              onChangeText={setReason}
              placeholder="Conference, personal leave…"
              maxLength={200}
            />
          </>
        ) : preview ? (
          preview.conflicts.length === 0 ? (
            <Text style={styles.body}>No booked appointments fall on these dates.</Text>
          ) : (
            <>
              <Text style={styles.heading}>
                {preview.conflicts.length} booked appointment{preview.conflicts.length === 1 ? '' : 's'} on these dates
              </Text>
              <ConflictList conflicts={preview.conflicts} />
              <Choice
                selected={onConflict === 'keep'}
                title="Keep these appointments"
                subtitle="Only new bookings are stopped. You still see these patients."
                onPress={() => setOnConflict('keep')}
              />
              <Choice
                selected={onConflict === 'cancel'}
                title="Cancel and refund them"
                subtitle="Each patient is refunded in full and told why."
                onPress={() => setOnConflict('cancel')}
              />
            </>
          )
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
        {!!sheetError && <Text style={styles.error}>{sheetError}</Text>}
      </FormSheet>
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: GUTTER, paddingTop: S.lg },
    section: { marginTop: S.md },
    entry: { flexDirection: 'row', alignItems: 'center' },
    strong: { ...T.bodyStrong, color: c.ink },
    caption: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    body: { ...T.body, color: c.inkMuted },
    heading: { ...T.subhead, color: c.ink },
    badge: { marginTop: S.sm },
    iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    field: { marginBottom: S.lg },
    conflicts: { marginVertical: S.md },
    conflictRow: {
      paddingVertical: S.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
    },
    choice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: S.md,
      borderRadius: R.control,
      borderWidth: 1,
      borderColor: c.line,
      marginTop: S.sm,
    },
    choiceSelected: { borderColor: c.accent, backgroundColor: c.accentSoft },
    choiceText: { flex: 1, marginLeft: S.sm },
    footerRow: { flexDirection: 'row' },
    footerPrimary: { flex: 1, marginLeft: S.sm },
    error: { ...T.caption, color: c.error, marginTop: S.md },
    bottomSpace: { height: S.huge * 2 },
  });

export default TimeOffSection;
