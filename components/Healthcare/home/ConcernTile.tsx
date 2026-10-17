// ConcernTile — a common concern as a round, coloured icon with its name under
// it (back pain, fever, acne …). The icon is its specialty's, so a patient who
// knows only how they feel lands with the right doctors.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HC_HOME, HC_TYPE, HCRadius, HCSpace, makeHC, type HCPalette } from '../../../constants/HealthcareTheme';
import { useTheme } from '../../../theme';

const ConcernTile: React.FC<{ name: string; icon: string; tint: { fg: string; bg: string }; onPress: () => void }> = ({ name, icon, tint, onPress }) => {
  const { mode } = useTheme();
  const HC = useMemo(() => makeHC(mode), [mode]);
  const styles = useMemo(() => makeStyles(HC), [HC]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}. Doctors who treat it`}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <View style={[styles.well, { backgroundColor: tint.bg }]}>
        <MaterialCommunityIcons name={icon as keyof typeof MaterialCommunityIcons.glyphMap} size={HCSpace.xxl + HCSpace.xxs} color={tint.fg} />
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
    </Pressable>
  );
};

const makeStyles = (HC: HCPalette) =>
  StyleSheet.create({
    root: { width: HC_HOME.well + HCSpace.xxl, alignItems: 'center', gap: HCSpace.sm },
    pressed: { opacity: 0.7 },
    well: { width: HC_HOME.well, height: HC_HOME.well, borderRadius: HCRadius.pill, alignItems: 'center', justifyContent: 'center' },
    name: { ...HC_TYPE.caption, color: HC.textBody, textAlign: 'center' },
  });

export default ConcernTile;
