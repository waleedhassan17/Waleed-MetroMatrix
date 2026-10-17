// QuickRow — a slim white row that leads somewhere ("My appointments", when
// there is no next visit to show).

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HC_HOME, HC_TYPE, HCRadius, HCShadow, HCSpace, makeHC, type HCPalette } from '../../../constants/HealthcareTheme';
import { useTheme } from '../../../theme';

const QuickRow: React.FC<{ icon: keyof typeof Ionicons.glyphMap; title: string; body?: string; onPress: () => void }> = ({ icon, title, body, onPress }) => {
  const { mode } = useTheme();
  const HC = useMemo(() => makeHC(mode), [mode]);
  const styles = useMemo(() => makeStyles(HC), [HC]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={body ? `${title}. ${body}` : title}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <View style={styles.well}>
        <Ionicons name={icon} size={HCSpace.xl} color={HC.primary} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={HCSpace.xl} color={HC.textMuted} />
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
      backgroundColor: HC.card,
      borderWidth: 1,
      borderColor: HC.borderLight,
      ...HCShadow.xs,
    },
    pressed: { opacity: 0.85 },
    well: { width: HC_HOME.arrowWell + HCSpace.sm, height: HC_HOME.arrowWell + HCSpace.sm, borderRadius: HCRadius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: HC.primaryLight },
    text: { flex: 1, gap: HCSpace.xxs },
    title: { ...HC_TYPE.body, fontWeight: HC_TYPE.cardTitle.fontWeight, color: HC.textDark },
    body: { ...HC_TYPE.caption, color: HC.textLight },
  });

export default QuickRow;
