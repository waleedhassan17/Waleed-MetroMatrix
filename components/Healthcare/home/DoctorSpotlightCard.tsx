// DoctorSpotlightCard — a top doctor on the Health home.
// A deep-blue card: the doctor's photo in a white ring, the verified tick,
// name, specialty, rating and experience, the starting fee as a pill, and
// "Book" as a white button. The card opens the profile; Book opens it too,
// ready to choose a time — siblings, never one button inside another.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatMoney } from '../../../constants/Currency';
import { HC_HOME, HC_ON_BLUE, HC_TYPE, HCRadius, HCShadow, HCSpace, makeHC } from '../../../constants/HealthcareTheme';
import type { Doctor } from '../../../models/healthcare/types';
import { useTheme } from '../../../theme';
import { fromFee } from '../../../utils/healthcare/homeDisplay';
import DoctorAvatar from '../DoctorAvatar';

const PORTRAIT = 56;

const DoctorSpotlightCard: React.FC<{ doctor: Doctor; onPress: () => void; onBook: () => void }> = ({ doctor: d, onPress, onBook }) => {
  const { mode } = useTheme();
  const star = useMemo(() => makeHC(mode).star, [mode]);
  const styles = useMemo(() => makeStyles(), []);
  const name = d.name || 'Doctor';
  const fee = fromFee(d);
  const rated = d.rating > 0;
  const meta = [rated ? `${d.rating.toFixed(1)} (${d.totalReviews})` : 'New', d.experience ? `${d.experience} yrs` : null].filter(Boolean).join('  ·  ');
  return (
    <View style={styles.root}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={[
          name,
          d.specialtyName,
          d.experience ? `${d.experience} years experience` : null,
          rated ? `rated ${d.rating.toFixed(1)} from ${d.totalReviews} reviews` : null,
          fee ? `fee from ${formatMoney(fee)}` : null,
        ]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint="Opens the doctor's profile"
        style={({ pressed }) => [styles.head, pressed && styles.pressed]}
      >
        <View style={styles.ring}>
          <DoctorAvatar doctor={d} size={PORTRAIT} />
        </View>
        <View style={styles.text}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {d.isVerified ? <Ionicons name="checkmark-circle" size={HCSpace.lg} color={HC_ON_BLUE.ink} /> : null}
          </View>
          {d.specialtyName ? (
            <Text style={styles.soft} numberOfLines={1}>
              {d.specialtyName}
            </Text>
          ) : null}
          <View style={styles.meta}>
            {rated ? <Ionicons name="star" size={HCSpace.md + HCSpace.xxs} color={star} /> : null}
            <Text style={styles.metaText} numberOfLines={1}>
              {meta}
            </Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.foot}>
        {fee ? (
          <View style={styles.fee}>
            <Text style={styles.feeText}>{`from ${formatMoney(fee)}`}</Text>
          </View>
        ) : (
          <View />
        )}
        <Pressable onPress={onBook} accessibilityRole="button" accessibilityLabel={`Book ${name}`} style={({ pressed }) => [styles.book, pressed && styles.pressed]}>
          <Ionicons name="calendar-outline" size={HCSpace.lg} color={HC_ON_BLUE.spotlight} />
          <Text style={styles.bookText}>Book</Text>
        </Pressable>
      </View>
    </View>
  );
};

const makeStyles = () =>
  StyleSheet.create({
    root: { width: HC_HOME.spotlightWidth, borderRadius: HCRadius.lg, padding: HCSpace.lg, gap: HCSpace.lg, backgroundColor: HC_ON_BLUE.spotlight, ...HCShadow.sm },
    head: { flexDirection: 'row', alignItems: 'center', gap: HCSpace.md },
    pressed: { opacity: 0.85 },
    ring: { borderRadius: HCRadius.lg, borderWidth: HC_HOME.portraitRing, borderColor: HC_ON_BLUE.ink, padding: HC_HOME.portraitRing },
    text: { flex: 1, gap: HCSpace.xs },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: HCSpace.xs },
    name: { ...HC_TYPE.cardTitle, color: HC_ON_BLUE.ink, flexShrink: 1 },
    soft: { ...HC_TYPE.small, color: HC_ON_BLUE.soft },
    meta: { flexDirection: 'row', alignItems: 'center', gap: HCSpace.xs },
    metaText: { ...HC_TYPE.caption, color: HC_ON_BLUE.soft, flexShrink: 1 },
    foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: HCSpace.sm },
    fee: { paddingHorizontal: HCSpace.md, paddingVertical: HCSpace.xs, borderRadius: HCRadius.pill, backgroundColor: HC_ON_BLUE.tint },
    feeText: { ...HC_TYPE.chip, color: HC_ON_BLUE.ink },
    book: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: HCSpace.xs,
      minHeight: HC_HOME.touch - HCSpace.sm,
      paddingHorizontal: HCSpace.lg,
      borderRadius: HCRadius.pill,
      backgroundColor: HC_ON_BLUE.ink,
    },
    bookText: { ...HC_TYPE.link, color: HC_ON_BLUE.spotlight },
  });

export default DoctorSpotlightCard;
