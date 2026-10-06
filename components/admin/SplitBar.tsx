import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { R, S, T, useTheme, type ThemeColors } from '../../theme';
import { formatCount } from '../../utils/admin/format';

/**
 * How one whole divides: a single bar split into its parts, with a legend that
 * writes every part out (label, count, share). For a handful of parts that
 * add up to something — a provider type's states. A part too small to see
 * still gets a sliver, so nothing that exists disappears; a thin gap keeps
 * neighbours that share a colour apart.
 */
export interface SplitSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface SplitBarProps {
  segments: SplitSegment[];
  format?: (n: number) => string;
  emptyText?: string;
}

const MIN_SHARE = 0.02;

export const sharePercent = (value: number, total: number): number => (total > 0 ? Math.round((value / total) * 100) : 0);

const SplitBar: React.FC<SplitBarProps> = ({ segments, format = formatCount, emptyText = 'None yet.' }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const total = segments.reduce((n, s) => n + s.value, 0);
  const shown = segments.filter((s) => s.value > 0);

  if (!total) return <Text style={styles.empty}>{emptyText}</Text>;

  const summary = shown.map((s) => `${s.label} ${format(s.value)} (${sharePercent(s.value, total)}%)`).join(', ');

  return (
    <View>
      <View style={styles.track} accessible accessibilityRole="image" accessibilityLabel={`${format(total)} in all: ${summary}.`}>
        {shown.map((s, i) => (
          <View
            key={s.key}
            style={[
              styles.part,
              { flexGrow: Math.max(s.value / total, MIN_SHARE), backgroundColor: s.color },
              i < shown.length - 1 && styles.gap,
            ]}
          />
        ))}
      </View>
      <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {segments.map((s) => (
          <View key={s.key} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.label} numberOfLines={1}>
              {s.label}
            </Text>
            <Text style={styles.value}>
              {format(s.value)}
              <Text style={styles.share}>{`  ${sharePercent(s.value, total)}%`}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    track: { flexDirection: 'row', height: 10, borderRadius: R.control, overflow: 'hidden', backgroundColor: c.surfaceSunken },
    part: { flexBasis: 0, height: '100%' },
    gap: { marginRight: 2 },
    legend: { marginTop: S.sm, gap: S.xs },
    item: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
    dot: { width: 8, height: 8, borderRadius: 4 },
    label: { ...T.body, color: c.ink, flex: 1 },
    value: { ...T.bodyStrong, color: c.ink, fontVariant: ['tabular-nums'] },
    share: { ...T.caption, color: c.inkMuted },
    empty: { ...T.body, color: c.inkMuted, paddingVertical: S.sm },
  });

export default SplitBar;
