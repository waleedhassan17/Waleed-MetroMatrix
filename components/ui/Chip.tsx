import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { HS } from '../../constants/HomeServiceTheme';
import { C, F, R, S, T } from '../../constants/theme';

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
  const fg = disabled ? C.inkFaint : selected ? HS.accentDeep : C.inkMuted;

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
          backgroundColor: selected ? HS.accentSoft : C.surface,
          borderColor: selected ? HS.accentLine : C.line,
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

const styles = StyleSheet.create({
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
    backgroundColor: C.surfaceSunken,
    alignItems: 'center',
  },
  countSelected: { backgroundColor: C.surface },
  countText: { ...T.micro },
});

export default Chip;
