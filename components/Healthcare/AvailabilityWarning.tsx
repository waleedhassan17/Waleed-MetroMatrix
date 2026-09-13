// ============================================================================
// "Patients cannot book you right now."
//
// WHY THIS EXISTS
// ---------------
// Slot generation was one-shot: the app published a fixed 30-day window and
// nothing ever extended it. A doctor set their availability once and about a
// month later it silently ran out. Production reached the state where ALL 530
// slots were in the past and every one of thirteen doctors was unbookable, and
// nothing in the product said so.
//
// A rolling server-side job now keeps the horizon populated. This is the second
// line of defence, for what the job cannot solve: a doctor who has never set
// weekly hours, or who has no clinic to hold them at.
//
// Presentational: the status comes from the dashboard slice, fetched alongside
// the dashboard. As its own component fetching on mount, it fired twice per
// dashboard load and rendered under the status bar.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Button from '../ui/Button';
import Card from '../ui/Card';
import { S, T } from '../../constants/theme';
import type { AvailabilityStatus } from '../../networks/healthcare/providerApi';
import { ThemeColors, useTheme } from '../../theme';

interface Props {
  status: AvailabilityStatus;
  /** Opens the Availability hub. */
  onSetUp: () => void;
  /** Tops the horizon up from the existing weekly hours. */
  onExtend?: () => void;
  extending?: boolean;
}

const COPY: Record<string, { tone: 'error' | 'warn'; icon: string; title: string; body: string; cta: string }> = {
  not_set: {
    tone: 'error',
    icon: 'calendar-outline',
    title: 'Patients cannot book you yet',
    body: "You haven't set your weekly hours, so your calendar is empty for everyone searching.",
    cta: 'Set weekly hours',
  },
  exhausted: {
    tone: 'error',
    icon: 'alert-circle-outline',
    title: 'Your availability has run out',
    body: 'You have no bookable slots left, so patients see an empty calendar.',
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

export const AvailabilityWarning: React.FC<Props> = ({ status, onSetUp, onExtend, extending }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Renders nothing when there is nothing to say — a permanent banner is noise.
  const copy = COPY[status.state];
  if (!copy) return null;

  const tint = copy.tone === 'error' ? colors.error : colors.warning;
  // A doctor with weekly hours but no runway can be fixed in one tap.
  const canExtend = !!onExtend && status.hasTemplate && status.state !== 'not_set';

  return (
    <Card accentRule={tint} style={styles.card}>
      <View style={styles.row}>
        <Ionicons name={copy.icon as any} size={20} color={tint} style={styles.icon} />
        <View style={styles.text}>
          <Text style={[styles.title, { color: tint }]}>{copy.title}</Text>
          <Text style={styles.body}>
            {copy.body}
            {status.lastAvailableDate && status.state === 'running_out'
              ? ` Bookable through ${status.lastAvailableDate}.`
              : ''}
          </Text>
          {!status.hasClinics && (
            <Text style={styles.body}>Add a clinic so patients know where to come for in-clinic visits.</Text>
          )}
          <View style={styles.actions}>
            <Button label={copy.cta} size="sm" fullWidth={false} onPress={onSetUp} />
            {canExtend && (
              <Button
                label="Extend now"
                size="sm"
                variant="secondary"
                fullWidth={false}
                loading={extending}
                onPress={onExtend}
                style={styles.secondary}
              />
            )}
          </View>
        </View>
      </View>
    </Card>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { marginBottom: S.lg },
    row: { flexDirection: 'row' },
    icon: { marginRight: S.md, marginTop: 1 },
    text: { flex: 1 },
    title: { ...T.subhead },
    body: { ...T.body, color: c.inkMuted, marginTop: S.xs },
    actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: S.md },
    secondary: { marginLeft: S.sm },
  });

export default AvailabilityWarning;
