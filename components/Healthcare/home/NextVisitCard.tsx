// NextVisitCard — the patient's next appointment, near the top of the home.
// A solid blue card in white: the doctor's photo in a white ring, who and
// what, when and how soon, where (or video), and the one thing to do now
// (join, pay) as a white button. The card opens the appointment; the action
// is its sibling, never a button inside a button.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HC_HOME, HC_ON_BLUE, HC_TYPE, HCRadius, HCShadow, HCSpace } from '../../../constants/HealthcareTheme';
import type { Appointment } from '../../../models/healthcare/types';
import { formatApptDate, formatApptTime } from '../../../utils/healthcare/doctorDisplay';
import type { VisitAction } from '../../../utils/healthcare/homeDisplay';
import DoctorAvatar from '../DoctorAvatar';

export interface NextVisitCardProps {
  appointment: Appointment;
  soon: string | null;
  action: VisitAction | null;
  onPress: () => void;
  onAction: () => void;
}

const PORTRAIT = 48;

const NextVisitCard: React.FC<NextVisitCardProps> = ({ appointment: a, soon, action, onPress, onAction }) => {
  const styles = useMemo(() => makeStyles(), []);
  const name = a.doctorName || 'Your doctor';
  const when = [formatApptDate(a.date), formatApptTime(a.timeSlot)].filter(Boolean).join(' · ');
  const where = a.type === 'video' ? 'Video consultation' : [a.clinicName, a.clinicAddress].filter(Boolean).join(', ') || 'Clinic visit';
  return (
    <View style={styles.root}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Your next visit: ${name}${a.specialtyName ? `, ${a.specialtyName}` : ''}, ${when}, ${where}${soon ? `, ${soon}` : ''}`}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <View style={styles.ring}>
          <DoctorAvatar doctor={{ name, profileImage: a.doctorImage || '' }} size={PORTRAIT} />
        </View>
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {a.specialtyName || (a.patientName && a.patientName !== name) ? (
            <Text style={styles.soft} numberOfLines={1}>
              {[a.specialtyName, a.patientName ? `for ${a.patientName}` : null].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          <View style={styles.row}>
            <Ionicons name="time-outline" size={HCSpace.lg} color={HC_ON_BLUE.ink} />
            <Text style={styles.when}>{when}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name={a.type === 'video' ? 'videocam-outline' : 'location-outline'} size={HCSpace.lg} color={HC_ON_BLUE.ink} />
            <Text style={styles.soft} numberOfLines={1}>
              {where}
            </Text>
          </View>
          {soon ? (
            <View style={styles.soon}>
              <Text style={styles.soonText}>{soon}</Text>
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={HCSpace.xl} color={HC_ON_BLUE.soft} />
      </Pressable>
      {action ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={action.label} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={HCSpace.lg} color={HC_ON_BLUE.nextVisit} />
          <Text style={styles.buttonText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const makeStyles = () =>
  StyleSheet.create({
    root: { borderRadius: HCRadius.lg, padding: HCSpace.lg, gap: HCSpace.lg, backgroundColor: HC_ON_BLUE.nextVisit, ...HCShadow.brand },
    main: { flexDirection: 'row', gap: HCSpace.md, alignItems: 'center' },
    pressed: { opacity: 0.85 },
    ring: { borderRadius: HCRadius.lg, borderWidth: HC_HOME.portraitRing, borderColor: HC_ON_BLUE.ink, padding: HC_HOME.portraitRing, alignSelf: 'flex-start' },
    text: { flex: 1, gap: HCSpace.xs },
    name: { ...HC_TYPE.cardTitle, color: HC_ON_BLUE.ink },
    soft: { ...HC_TYPE.small, color: HC_ON_BLUE.soft, flexShrink: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: HCSpace.xs },
    when: { ...HC_TYPE.body, fontWeight: HC_TYPE.cardTitle.fontWeight, color: HC_ON_BLUE.ink },
    soon: { alignSelf: 'flex-start', paddingHorizontal: HCSpace.sm, paddingVertical: HCSpace.xxs, borderRadius: HCRadius.pill, backgroundColor: HC_ON_BLUE.tint },
    soonText: { ...HC_TYPE.chip, color: HC_ON_BLUE.ink },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: HCSpace.sm,
      minHeight: HC_HOME.touch,
      borderRadius: HCRadius.md,
      backgroundColor: HC_ON_BLUE.ink,
    },
    buttonText: { ...HC_TYPE.link, color: HC_ON_BLUE.nextVisit },
  });

export default NextVisitCard;
