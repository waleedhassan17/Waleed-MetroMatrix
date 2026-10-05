import React, { useMemo } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { R, S, T, useTheme, type ThemeColors } from '../../theme';

/**
 * One figure: a label, a value (already formatted — "—" when the server sent
 * none), and what it covers ("Today", "Month to date", "Last 30 days"). A
 * number without its period is how the old dashboard showed an all-time total
 * under a "this month" heading.
 *
 * `delta` is the server's percentage change against the period it names in
 * the caption; it shows as a ▲/▼ chip, green when the change is good. Null
 * (nothing to compare with) shows no chip rather than an invented "0 %".
 */
export interface KpiTileProps {
  label: string;
  value: string;
  caption?: string;
  /** Ionicons glyph in a tinted well beside the label. */
  icon?: string;
  /** Percent change vs the comparison period; null/undefined hides the chip. */
  delta?: number | null;
  /** Whether a rise is good news (bookings) or bad (cancellations). */
  higherIsBetter?: boolean;
  /** Colours the value: a backlog that needs action is `warning`. */
  tone?: 'neutral' | 'warning' | 'error' | 'success';
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export const KpiTile: React.FC<KpiTileProps> = ({
  label,
  value,
  caption,
  icon,
  delta,
  higherIsBetter = true,
  tone = 'neutral',
  onPress,
  accessibilityLabel,
  style,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const valueColor = tone === 'warning' ? colors.warning : tone === 'error' ? colors.error : tone === 'success' ? colors.success : colors.ink;

  const hasDelta = typeof delta === 'number' && Number.isFinite(delta);
  const up = hasDelta && (delta as number) > 0;
  const flat = hasDelta && delta === 0;
  const good = flat ? null : up === higherIsBetter;
  const deltaText = hasDelta ? `${flat ? '' : up ? '▲ ' : '▼ '}${Math.abs(delta as number).toLocaleString('en-PK', { maximumFractionDigits: 1 })}%` : '';
  const deltaInk = good === null ? colors.inkMuted : good ? colors.success : colors.error;
  const deltaGround = good === null ? colors.surfaceSunken : good ? colors.successSoft : colors.errorSoft;
  const deltaWords = hasDelta ? `${flat ? 'no change' : `${up ? 'up' : 'down'} ${Math.abs(delta as number)} percent`}` : '';

  const body = (
    <>
      <View style={styles.head}>
        {!!icon && (
          <View style={styles.iconWell}>
            <Ionicons name={icon as any} size={16} color={colors.accent} />
          </View>
        )}
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {(hasDelta || !!caption) && (
        <View style={styles.foot}>
          {hasDelta && (
            <View style={[styles.delta, { backgroundColor: deltaGround }]}>
              <Text style={[styles.deltaText, { color: deltaInk }]}>{deltaText}</Text>
            </View>
          )}
          {!!caption && (
            <Text style={styles.caption} numberOfLines={2}>
              {caption}
            </Text>
          )}
        </View>
      )}
    </>
  );

  const a11y = accessibilityLabel ?? [`${label}: ${value}`, deltaWords, caption].filter(Boolean).join(', ');
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
      minHeight: 104,
      padding: S.md,
      borderRadius: R.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    pressed: { backgroundColor: c.surfaceSunken },
    head: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
    iconWell: { width: 28, height: 28, borderRadius: R.control, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft },
    label: { ...T.caption, color: c.inkMuted, flex: 1 },
    value: { ...T.heading, marginTop: S.sm, fontVariant: ['tabular-nums'] },
    foot: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: S.xs, marginTop: S.xs },
    delta: { paddingHorizontal: S.xs + 2, paddingVertical: 1, borderRadius: R.control },
    deltaText: { ...T.micro, fontVariant: ['tabular-nums'] },
    caption: { ...T.caption, color: c.inkMuted, flexShrink: 1 },
  });

export default KpiTile;
