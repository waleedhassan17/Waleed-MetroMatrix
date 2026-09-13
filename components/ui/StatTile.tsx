import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { R, S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';

/**
 * One number and what it counts — "8 Today", "2 Requests".
 *
 * The label is sentence case at caption size. The tiles it replaces used 10 pt
 * uppercase labels in 56 pt-wide cards, where "CANCELLED" wrapped or clipped.
 */
export interface StatTileProps {
  value: string | number;
  label: string;
  /** Colours the number. A count that needs attention gets `warning`. */
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'error';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const StatTile: React.FC<StatTileProps> = ({ value, label, tone = 'neutral', onPress, style, accessibilityLabel }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const valueColor =
    tone === 'accent'
      ? colors.accentDeep
      : tone === 'success'
        ? colors.success
        : tone === 'warning'
          ? colors.warning
          : tone === 'error'
            ? colors.error
            : colors.ink;

  const body = (
    <>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.tile, style]} accessibilityLabel={accessibilityLabel ?? `${value} ${label}`}>
        {body}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.tile, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${value} ${label}`}
    >
      {body}
    </TouchableOpacity>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    tile: {
      flex: 1,
      minHeight: 72,
      backgroundColor: c.surface,
      borderRadius: R.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      paddingVertical: S.md,
      paddingHorizontal: S.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    value: { ...T.heading },
    label: { ...T.caption, color: c.inkMuted, marginTop: 2 },
  });

export default StatTile;
