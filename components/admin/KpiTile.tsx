import React, { useMemo } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { R, S, T, useTheme, type ThemeColors } from '../../theme';

/**
 * One figure: a label, a value (already formatted — "—" when the server sent
 * none), and what it covers ("Today", "Month to date", "+12% vs same period
 * last month"). A number without its period is how the old dashboard showed
 * an all-time total under a "this month" heading.
 */
export interface KpiTileProps {
  label: string;
  value: string;
  caption?: string;
  /** Colours the value: a backlog that needs action is `warning`. */
  tone?: 'neutral' | 'warning' | 'error' | 'success';
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export const KpiTile: React.FC<KpiTileProps> = ({ label, value, caption, tone = 'neutral', onPress, accessibilityLabel, style }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const valueColor = tone === 'warning' ? colors.warning : tone === 'error' ? colors.error : tone === 'success' ? colors.success : colors.ink;

  const body = (
    <>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {!!caption && (
        <Text style={styles.caption} numberOfLines={2}>
          {caption}
        </Text>
      )}
    </>
  );

  const a11y = accessibilityLabel ?? `${label}: ${value}${caption ? `, ${caption}` : ''}`;
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.tile, pressed && styles.pressed, style]}
        accessibilityRole="button"
        accessibilityLabel={a11y}
      >
        {body}
      </Pressable>
    );
  }
  return (
    <View style={[styles.tile, style]} accessible accessibilityLabel={a11y}>
      {body}
    </View>
  );
};

/** Tiles two to a row. */
export const KpiGrid: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => (
  <View style={[gridStyles.grid, style]}>
    {React.Children.map(children, (child) => (child ? <View style={gridStyles.cell}>{child}</View> : null))}
  </View>
);

const gridStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -S.xs },
  cell: { width: '50%', padding: S.xs },
});

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    tile: {
      minHeight: 96,
      padding: S.md,
      borderRadius: R.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    pressed: { backgroundColor: c.surfaceSunken },
    label: { ...T.caption, color: c.inkMuted },
    value: { ...T.heading, marginTop: S.xs, fontVariant: ['tabular-nums'] },
    caption: { ...T.caption, color: c.inkMuted, marginTop: S.xs },
  });

export default KpiTile;
