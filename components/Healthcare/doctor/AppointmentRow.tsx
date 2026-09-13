import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ToneBadge from '../../ui/ToneBadge';
import { F, S, T } from '../../../constants/theme';
import type { DoctorAppointment } from '../../../models/healthcare/doctorHub';
import { ThemeColors, useTheme } from '../../../theme';
import {
  appointmentStatusMeta,
  consultationIcon,
  consultationLabel,
  formatDayHeading,
  formatTime,
} from '../../../utils/healthcare/doctorFormat';

/**
 * One appointment in a list — Home's "Today", the Schedule, a patient's visits.
 *
 * Every row everywhere opens the same appointment screen. Before, a Schedule
 * row opened the patient's history, a dashboard row opened a notes list, and a
 * history row only highlighted itself.
 */
export interface AppointmentRowProps {
  appointment: DoctorAppointment;
  onPress: (appointment: DoctorAppointment) => void;
  /** Prefix the time with the day ("Tomorrow", "Fri, 18 Sep"). */
  showDate?: boolean;
  todayKey?: string;
  uses24h?: boolean;
  divider?: boolean;
}

const AppointmentRow: React.FC<AppointmentRowProps> = ({
  appointment: a,
  onPress,
  showDate,
  todayKey = '',
  uses24h = false,
  divider,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const status = appointmentStatusMeta(a.status);
  const where = a.type === 'video' ? consultationLabel(a.type) : a.clinic?.name || consultationLabel(a.type);

  return (
    <TouchableOpacity
      style={[styles.row, divider && styles.divider]}
      onPress={() => onPress(a)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${a.patientName}, ${formatTime(a.startTime, uses24h)}, ${where}, ${status.label}`}
    >
      <View style={styles.time}>
        {showDate && !!a.dateKey && (
          <Text style={styles.day} numberOfLines={1}>
            {formatDayHeading(a.dateKey, todayKey)}
          </Text>
        )}
        <Text style={styles.start}>{formatTime(a.startTime, uses24h)}</Text>
        <Text style={styles.end}>{formatTime(a.endTime, uses24h)}</Text>
      </View>

      <View style={styles.rule} />

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {a.patientName}
        </Text>
        <View style={styles.meta}>
          <Ionicons name={consultationIcon(a.type) as any} size={13} color={colors.inkMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {where}
          </Text>
        </View>
        {a.status !== 'confirmed' && <ToneBadge label={status.label} tone={status.tone} style={styles.badge} />}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
    </TouchableOpacity>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: S.md,
      minHeight: 64,
    },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    time: { width: 72 },
    day: { ...T.caption, color: c.accentDeep, marginBottom: 2 },
    start: { ...T.bodyStrong, color: c.ink },
    end: { ...T.caption, color: c.inkMuted },
    rule: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: c.line, marginRight: S.md },
    body: { flex: 1, marginRight: S.sm },
    name: { ...T.subhead, fontFamily: F.semibold, color: c.ink },
    meta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    metaText: { ...T.caption, color: c.inkMuted, marginLeft: 4, flexShrink: 1 },
    badge: { marginTop: S.xs },
  });

export default memo(AppointmentRow);
