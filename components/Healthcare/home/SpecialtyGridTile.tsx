// SpecialtyGridTile — a line icon in a coloured circle, the name, and how
// many doctors there are. One categorical colour per tile, so a grid of eight
// reads as eight things at a glance.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HC_HOME, HC_TYPE, HCRadius, HCSpace, makeHC, type HCPalette } from '../../../constants/HealthcareTheme';
import type { Specialty } from '../../../models/healthcare/types';
import { useTheme } from '../../../theme';
import { gridLabel, specialtyIcon } from '../../../utils/healthcare/homeDisplay';

const SpecialtyGridTile: React.FC<{ specialty: Specialty; tint: { fg: string; bg: string }; onPress: () => void }> = ({ specialty: s, tint, onPress }) => {
  const { mode } = useTheme();
  const HC = useMemo(() => makeHC(mode), [mode]);
  const styles = useMemo(() => makeStyles(HC), [HC]);
  const count = s.doctorCount > 0 ? `${s.doctorCount} ${s.doctorCount === 1 ? 'doctor' : 'doctors'}` : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={count ? `${s.name}, ${count}` : s.name}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <View style={[styles.well, { backgroundColor: tint.bg }]}>
        <MaterialCommunityIcons
          name={specialtyIcon(s.icon, s.name) as keyof typeof MaterialCommunityIcons.glyphMap}
          size={HCSpace.xxl + HCSpace.xxs}
          color={tint.fg}
        />
      </View>
      <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
        {gridLabel(s.name)}
      </Text>
      {count ? <Text style={styles.count}>{count}</Text> : null}
    </Pressable>
  );
};

const makeStyles = (HC: HCPalette) =>
  StyleSheet.create({
    root: { flex: 1, alignItems: 'center', gap: HCSpace.xs, paddingVertical: HCSpace.md, borderRadius: HCRadius.md, minHeight: HC_HOME.touch },
    pressed: { opacity: 0.7 },
    well: { width: HC_HOME.well, height: HC_HOME.well, borderRadius: HCRadius.pill, alignItems: 'center', justifyContent: 'center' },
    name: { ...HC_TYPE.caption, fontWeight: HC_TYPE.chip.fontWeight, color: HC.textDark, textAlign: 'center', minHeight: HC_TYPE.caption.lineHeight * 2 },
    count: { ...HC_TYPE.caption, color: HC.textMuted },
  });

export default SpecialtyGridTile;
