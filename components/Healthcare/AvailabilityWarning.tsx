// ============================================================================
// "Patients cannot book you right now."
//
// WHY THIS EXISTS
// ---------------
// Slot generation was one-shot: the app published a fixed 30-day window and
// nothing ever extended it. A doctor set their availability once and about a
// month later it silently ran out — no error, no warning, just a calendar that
// stopped having anything in it. Production reached the state where ALL 530
// slots were in the past and every one of thirteen doctors was unbookable, and
// nothing in the product said so to anybody.
//
// A rolling server-side job now keeps the horizon populated, which is the real
// fix. This is the second line of defence, for the cases the job cannot solve
// on its own: a doctor who has never set a weekly template (there is nothing to
// roll forward), or who has no clinic to hold hours at.
//
// Renders nothing when everything is fine — a permanent banner is noise, and
// noise is what gets ignored.
// ============================================================================

import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { darkShift, type DarkShift } from '../../constants/darkShift';
import { useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  fetchAvailabilityStatusApi,
  refreshMySlotsApi,
  type AvailabilityStatus,
} from '../../networks/healthcare/providerApi';

interface Props {
  /** Opens the weekly availability editor. */
  onSetAvailability: () => void;
}

const COPY: Record<
  string,
  { tone: 'error' | 'warn'; icon: any; title: string; body: string; cta: string }
> = {
  not_set: {
    tone: 'error',
    icon: 'calendar-outline',
    title: 'Patients cannot book you yet',
    body: "You haven't set your weekly availability, so your calendar is empty for everyone searching.",
    cta: 'Set availability',
  },
  exhausted: {
    tone: 'error',
    icon: 'alert-circle-outline',
    title: 'Your availability has run out',
    body: 'You have no bookable slots left. Patients currently see an empty calendar.',
    cta: 'Review availability',
  },
  running_out: {
    tone: 'warn',
    icon: 'time-outline',
    title: 'Availability is running low',
    body: 'Only a few days of bookable slots remain.',
    cta: 'Review availability',
  },
};

export const AvailabilityWarning: React.FC<Props> = ({ onSetAvailability }) => {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const [status, setStatus] = useState<AvailabilityStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchAvailabilityStatusApi();
    setStatus(res.success ? res.data : null);
  }, []);

  // On focus, not just on mount: a doctor who fixes their availability and
  // comes back should not still be looking at the warning.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Nothing to say. Also the failure path — if the check itself fails, stay
  // silent rather than alarming a doctor whose availability may be perfectly
  // fine.
  if (!status || status.state === 'ok') return null;

  const copy = COPY[status.state];
  if (!copy) return null;

  const isError = copy.tone === 'error';

  // A doctor with a template but no runway can be fixed in one tap — that is
  // exactly what the rolling job does, so offer it directly rather than making
  // them re-enter hours they have already set.
  const canTopUp = status.hasTemplate && status.state !== 'not_set';

  const topUp = async () => {
    setBusy(true);
    try {
      await refreshMySlotsApi();
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.wrap, isError ? styles.wrapError : styles.wrapWarn]}>
      <Ionicons name={copy.icon} size={20} color={isError ? '#B91C1C' : '#B45309'} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: isError ? '#B91C1C' : '#B45309' }]}>
          {copy.title}
        </Text>
        <Text style={styles.body}>
          {copy.body}
          {status.lastAvailableDate && status.state === 'running_out'
            ? ` Bookable through ${status.lastAvailableDate}.`
            : ''}
        </Text>

        {!status.hasClinics && (
          <Text style={styles.body}>Add a clinic first so patients know where to come.</Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity onPress={onSetAvailability} style={styles.cta} activeOpacity={0.8}>
            <Text style={styles.ctaText}>{copy.cta}</Text>
          </TouchableOpacity>

          {canTopUp && (
            <TouchableOpacity onPress={topUp} disabled={busy} style={styles.secondary}>
              {busy ? (
                <ActivityIndicator size="small" color="#334155" />
              ) : (
                <Text style={styles.secondaryText}>Extend now</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const makeStyles = (sh: DarkShift) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  wrapError: { backgroundColor: sh.ground('#FEF2F2', '#EF4444'), borderColor: sh.ground('#FECACA', '#EF4444') },
  wrapWarn: { backgroundColor: sh.ground('#FFFBEB', '#F59E0B'), borderColor: sh.hue('#FDE68A') },
  title: { fontSize: 15, fontWeight: '800' },
  body: { fontSize: 13, color: sh.n('#475569', 'inkMuted'), marginTop: 4, lineHeight: 19 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  cta: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: sh.hue('#2A7FFF'),
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  secondary: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: sh.n('#E2E8F0', 'line'),
    minWidth: 92,
    alignItems: 'center',
  },
  secondaryText: { color: sh.n('#334155', 'ink'), fontWeight: '700', fontSize: 13 },
});

export default AvailabilityWarning;
