import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { F, R, S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { uiAccent } from './accentCompat';

/**
 * Filter / segmented-control chip.
 *
 * Selection is carried by ground, border AND weight — not colour alone, which
 * disappears for anyone who cannot separate the two hues.
 */
export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Ionicons glyph. */
  icon?: string;
  /** Trailing count. Hidden when undefined; `0` still renders. */
  count?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const Chip: React.FC<ChipProps> = ({
  label,
  selected,
  onPress,
  icon,
  count,
  disabled,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const a = uiAccent(colors, isDark);

  const fg = disabled ? colors.inkFaint : selected ? a.accentDeep : colors.inkMuted;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? a.accentSoft : colors.surface,
          borderColor: selected ? a.accentLine : colors.line,
        },
        style,
      ]}
    >
      {!!icon && <Ionicons name={icon as any} size={14} color={fg} style={styles.icon} />}
      <Text style={[T.label, { color: fg }, selected && styles.selectedText]} numberOfLines={1}>
        {label}
      </Text>
      {count !== undefined && (
        <View style={[styles.count, selected && styles.countSelected]}>
          <Text style={[styles.countText, { color: fg }]}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: S.md,
    borderRadius: R.chip,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: { marginRight: 6 },
  selectedText: { fontFamily: F.semibold },
  count: {
    marginLeft: 6,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: R.chip - 2,
    backgroundColor: c.surfaceSunken,
    alignItems: 'center',
  },
  countSelected: { backgroundColor: c.surface },
  countText: { ...T.micro },
});

export default Chip;
