// CityChip — the city the home is about, beside "Top doctors in …"; it opens
// the city picker.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HC_HOME, HC_TYPE, HCRadius, HCSpace, makeHC, type HCPalette } from '../../../constants/HealthcareTheme';
import { useTheme } from '../../../theme';

const CityChip: React.FC<{ city: string; onPress: () => void }> = ({ city, onPress }) => {
  const { mode } = useTheme();
  const HC = useMemo(() => makeHC(mode), [mode]);
  const styles = useMemo(() => makeStyles(HC), [HC]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`City: ${city}. Change`}
      hitSlop={HCSpace.sm}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <Ionicons name="location-outline" size={HCSpace.lg} color={HC.primary} />
      <Text style={styles.text} numberOfLines={1}>
        {city}
      </Text>
      <Ionicons name="chevron-down" size={HCSpace.md + HCSpace.xxs} color={HC.primary} />
    </Pressable>
  );
};

const makeStyles = (HC: HCPalette) =>
  StyleSheet.create({
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: HCSpace.xs,
      minHeight: HC_HOME.touch - HCSpace.md,
      paddingHorizontal: HCSpace.md,
      borderRadius: HCRadius.pill,
      backgroundColor: HC.primaryLight,
      maxWidth: '45%',
    },
    pressed: { opacity: 0.7 },
    text: { ...HC_TYPE.link, color: HC.primary, flexShrink: 1 },
  });

export default CityChip;
