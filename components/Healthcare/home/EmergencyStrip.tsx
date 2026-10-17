// EmergencyStrip — quietly last on the home: the number to call, and the way
// to the Emergency screen. Red, because it is the one emergency on the page.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HC_HOME, HC_TYPE, HCRadius, HCSpace, makeHC, type HCPalette } from '../../../constants/HealthcareTheme';
import type { EmergencyNumber } from '../../../models/healthcare/types';
import { useTheme } from '../../../theme';

const EmergencyStrip: React.FC<{ numbers: EmergencyNumber[]; onOpen: () => void }> = ({ numbers, onOpen }) => {
  const { mode } = useTheme();
  const HC = useMemo(() => makeHC(mode), [mode]);
  const styles = useMemo(() => makeStyles(HC), [HC]);
  const first = numbers[0];
  const line = first ? `Call ${first.number} (${first.label})${numbers.length > 1 ? ' or see all numbers' : ''}` : 'Emergency numbers and nearest help';
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`In an emergency. ${line}`} style={({ pressed }) => [styles.root, pressed && styles.pressed]}>
      <Ionicons name="call-outline" size={HCSpace.xl} color={HC.errorDark} />
      <View style={styles.text}>
        <Text style={styles.title}>In an emergency</Text>
        <Text style={styles.body}>{line}</Text>
      </View>
      <Ionicons name="chevron-forward" size={HCSpace.xl} color={HC.errorDark} />
    </Pressable>
  );
};

const makeStyles = (HC: HCPalette) =>
  StyleSheet.create({
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: HCSpace.md,
      paddingHorizontal: HCSpace.lg,
      paddingVertical: HCSpace.md,
      minHeight: HC_HOME.touch,
      borderRadius: HCRadius.lg,
      backgroundColor: HC.errorLight,
    },
    pressed: { opacity: 0.85 },
    text: { flex: 1, gap: HCSpace.xxs },
    title: { ...HC_TYPE.body, fontWeight: HC_TYPE.cardTitle.fontWeight, color: HC.errorDark },
    body: { ...HC_TYPE.caption, color: HC.textMedium },
  });

export default EmergencyStrip;
