// "Why MetroMatrix Health": the three promises, each with its icon.

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HC_HOME, HC_TYPE, HCRadius, HCShadow, HCSpace, makeHC, type HCPalette } from '../../../constants/HealthcareTheme';
import { useTheme } from '../../../theme';

const TRUST: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: 'shield-checkmark-outline', title: 'Verified doctors', body: "Every doctor's PMDC registration is checked before they can take a booking." },
  { icon: 'wallet-outline', title: 'No commission', body: 'You pay your doctor directly. MetroMatrix takes no cut of the fee.' },
  { icon: 'lock-closed-outline', title: 'Private records', body: 'Your reports are shared only with the doctors you choose.' },
];

const TrustList: React.FC = () => {
  const { mode } = useTheme();
  const HC = useMemo(() => makeHC(mode), [mode]);
  const styles = useMemo(() => makeStyles(HC), [HC]);
  return (
    <View style={styles.root}>
      <Text style={styles.heading} accessibilityRole="header">
        Why MetroMatrix Health
      </Text>
      {TRUST.map((t) => (
        <View key={t.title} style={styles.row} accessible accessibilityLabel={`${t.title}. ${t.body}`}>
          <View style={styles.well}>
            <Ionicons name={t.icon} size={HCSpace.xl} color={HC.primary} />
          </View>
          <View style={styles.text}>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.body}>{t.body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const makeStyles = (HC: HCPalette) =>
  StyleSheet.create({
    root: {
      padding: HCSpace.xl,
      gap: HCSpace.lg,
      borderRadius: HCRadius.lg,
      backgroundColor: HC.card,
      borderWidth: 1,
      borderColor: HC.borderLight,
      ...HCShadow.xs,
    },
    heading: { ...HC_TYPE.sectionTitle, color: HC.textDark },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: HCSpace.md },
    well: { width: HC_HOME.arrowWell + HCSpace.sm, height: HC_HOME.arrowWell + HCSpace.sm, borderRadius: HCRadius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: HC.primaryLight },
    text: { flex: 1, gap: HCSpace.xxs },
    title: { ...HC_TYPE.body, fontWeight: HC_TYPE.cardTitle.fontWeight, color: HC.textDark },
    body: { ...HC_TYPE.small, color: HC.textLight },
  });

export default TrustList;
