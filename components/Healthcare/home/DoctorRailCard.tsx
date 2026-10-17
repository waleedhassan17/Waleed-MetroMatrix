// DoctorRailCard — a doctor in the "Available today" rail: portrait, name,
// specialty, a "Today" mark, and the rating, experience and starting fee.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatMoney } from '../../../constants/Currency';
import { HC_HOME, HC_TYPE, HCRadius, HCShadow, HCSpace, makeHC, type HCPalette } from '../../../constants/HealthcareTheme';
import type { Doctor } from '../../../models/healthcare/types';
import { useTheme } from '../../../theme';
import { fromFee } from '../../../utils/healthcare/homeDisplay';
import DoctorAvatar from '../DoctorAvatar';

const PORTRAIT = 56;

const DoctorRailCard: React.FC<{ doctor: Doctor; onPress: () => void }> = ({ doctor: d, onPress }) => {
  const { mode } = useTheme();
  const HC = useMemo(() => makeHC(mode), [mode]);
  const styles = useMemo(() => makeStyles(HC), [HC]);
  const name = d.name || 'Doctor';
  const fee = fromFee(d);
  const rated = d.rating > 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[name, d.specialtyName, 'available today', rated ? `rated ${d.rating.toFixed(1)}` : null, fee ? `from ${formatMoney(fee)}` : null]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <DoctorAvatar doctor={d} size={PORTRAIT} showVerified />
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {d.specialtyName ? (
            <Text style={styles.specialty} numberOfLines={1}>
              {d.specialtyName}
            </Text>
          ) : null}
          <View style={styles.today}>
            <View style={styles.dot} />
            <Text style={styles.todayText}>Available today</Text>
          </View>
        </View>
      </View>
      <View style={styles.foot}>
        <View style={styles.meta}>
          {rated ? (
            <>
              <Ionicons name="star" size={HCSpace.md + HCSpace.xxs} color={HC.star} />
              <Text style={styles.metaText}>{d.rating.toFixed(1)}</Text>
            </>
          ) : null}
          {d.experience ? <Text style={styles.metaText}>{`${rated ? '·  ' : ''}${d.experience} yrs`}</Text> : null}
        </View>
        {fee ? <Text style={styles.fee}>{`from ${formatMoney(fee)}`}</Text> : null}
      </View>
    </Pressable>
  );
};

const makeStyles = (HC: HCPalette) =>
  StyleSheet.create({
    root: {
      width: HC_HOME.railCardWidth,
      padding: HCSpace.lg,
      gap: HCSpace.md,
      borderRadius: HCRadius.lg,
      backgroundColor: HC.card,
      borderWidth: 1,
      borderColor: HC.borderLight,
      ...HCShadow.xs,
    },
    pressed: { opacity: 0.85 },
    head: { flexDirection: 'row', alignItems: 'center', gap: HCSpace.md },
    text: { flex: 1, gap: HCSpace.xxs },
    name: { ...HC_TYPE.cardTitle, color: HC.textDark },
    specialty: { ...HC_TYPE.small, color: HC.primary },
    today: { flexDirection: 'row', alignItems: 'center', gap: HCSpace.xs, marginTop: HCSpace.xxs },
    dot: { width: HCSpace.sm, height: HCSpace.sm, borderRadius: HCRadius.pill, backgroundColor: HC.success },
    todayText: { ...HC_TYPE.caption, color: HC.successDark },
    foot: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: HCSpace.md,
      borderTopWidth: 1,
      borderTopColor: HC.divider,
    },
    meta: { flexDirection: 'row', alignItems: 'center', gap: HCSpace.xs },
    metaText: { ...HC_TYPE.caption, color: HC.textMedium },
    fee: { ...HC_TYPE.chip, color: HC.textDark },
  });

export default DoctorRailCard;
