import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { S, T, useTheme, type ThemeColors } from '../../theme';
import { formatCount } from '../../utils/admin/format';
import { sharePercent, type SplitSegment } from './SplitBar';

/**
 * A whole and its few parts: a ring with the total in its middle, and every
 * part written out beside it — label, count, share. The legend is the reading
 * and the ring the picture, so no value is ever left to an angle. For four
 * parts or so; a longer list is a BarList, because lengths compare better.
 */
interface DonutChartProps {
  segments: SplitSegment[];
  /** What the total counts, shown under it: "providers". */
  caption: string;
  format?: (n: number) => string;
  size?: number;
}

const STROKE = 16;
/** Between neighbouring arcs, so two parts never merge into one. */
const GAP = 2;

/** Where each part's arc starts and how long it runs, around a ring of `circumference`. */
export function donutArcs(values: number[], circumference: number, gap = GAP): { start: number; length: number }[] {
  const total = values.reduce((n, v) => n + v, 0);
  if (!total) return [];
  const parts = values.filter((v) => v > 0).length;
  let start = 0;
  return values.map((v) => {
    const span = (v / total) * circumference;
    const arc = { start, length: v > 0 ? Math.max(span - (parts > 1 ? gap : 0), 1) : 0 };
    start += span;
    return arc;
  });
}

const DonutChart: React.FC<DonutChartProps> = ({ segments, caption, format = formatCount, size = 128 }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const total = segments.reduce((n, s) => n + s.value, 0);
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcs = donutArcs(segments.map((s) => s.value), circumference);
  const centre = size / 2;

  const summary = total
    ? `${format(total)} ${caption}: ${segments
        .filter((s) => s.value > 0)
        .map((s) => `${s.label} ${format(s.value)} (${sharePercent(s.value, total)}%)`)
        .join(', ')}.`
    : `No ${caption} yet.`;

  return (
    <View style={styles.row}>
      <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel={summary}>
        <Svg width={size} height={size}>
          {/* Turned a quarter back, so the first part starts at twelve o'clock. A
              transform string, not rotation/origin: those reach the web as an
              invalid DOM attribute. */}
          <G transform={`rotate(-90 ${centre} ${centre})`}>
            <Circle cx={centre} cy={centre} r={radius} stroke={colors.surfaceSunken} strokeWidth={STROKE} fill="none" />
            {segments.map((s, i) =>
              arcs[i] && arcs[i].length > 0 ? (
                <Circle
                  key={s.key}
                  cx={centre}
                  cy={centre}
                  r={radius}
                  stroke={s.color}
                  strokeWidth={STROKE}
                  fill="none"
                  strokeDasharray={`${arcs[i].length} ${circumference - arcs[i].length}`}
                  strokeDashoffset={-arcs[i].start}
                />
              ) : null
            )}
          </G>
        </Svg>
        <View style={styles.centre} pointerEvents="none">
          <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
            {format(total)}
          </Text>
          <Text style={styles.caption} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {caption}
          </Text>
        </View>
      </View>
      <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {segments.map((s) => (
          <View key={s.key} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <View style={styles.itemText}>
              <Text style={styles.label} numberOfLines={1}>
                {s.label}
              </Text>
              <Text style={styles.value}>
                {format(s.value)}
                <Text style={styles.share}>{`  ${sharePercent(s.value, total)}%`}</Text>
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: S.lg },
    centre: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: STROKE + S.xs },
    total: { ...T.heading, color: c.ink, fontVariant: ['tabular-nums'] },
    caption: { ...T.caption, color: c.inkMuted },
    legend: { flex: 1, gap: S.sm },
    item: { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
    itemText: { flex: 1 },
    label: { ...T.body, color: c.ink },
    value: { ...T.bodyStrong, color: c.ink, fontVariant: ['tabular-nums'] },
    share: { ...T.caption, color: c.inkMuted },
  });

export default DonutChart;
