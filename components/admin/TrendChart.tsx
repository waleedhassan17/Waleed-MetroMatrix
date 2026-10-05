import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { compact, Frame, linePath, nearestIndex, ticks, xAt, yAt } from '../ui/charts/geometry';
import { S, T, useTheme, type ThemeColors } from '../../theme';

/**
 * One measure over time: columns (counts — bookings a day) or a line (money).
 *
 * One series in the admin accent on one axis with three clean ticks. The last
 * bucket (today, this month) is drawn full strength and the rest a step
 * lighter, so "now" reads at a glance. Press and drag to read any bucket; the
 * readout names the date and the value. Screen readers get a one-sentence
 * summary (total, busiest bucket) instead of 90 numbers.
 */
export interface TrendPoint {
  /** 'YYYY-MM-DD' or 'YYYY-MM'. */
  date: string;
  value: number;
}

export interface TrendChartProps {
  data: TrendPoint[];
  kind?: 'columns' | 'line';
  /** How a value is written: formatMoney, formatCount. */
  format?: (n: number) => string;
  /** What is counted, for the summary: "bookings", "paid". */
  unit: string;
  height?: number;
}

const PAD = { padLeft: 36, padRight: 8, padTop: 10, padBottom: 22 };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM-DD' → 'Oct 5'; 'YYYY-MM' → 'Oct'. */
export function bucketLabel(date: string, long = false): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m) return date;
  if (!d) return long ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1];
  return `${MONTHS[m - 1]} ${d}`;
}

const TrendChart: React.FC<TrendChartProps> = ({ data, kind = 'columns', format = (n) => compact(n), unit, height = 168 }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const n = data.length;
  const max = Math.max(0, ...data.map((p) => p.value));
  const yTicks = ticks(max || 1);
  const top = yTicks[yTicks.length - 1];
  const frame: Frame = { width, height, ...PAD };
  const plotW = Math.max(0, width - PAD.padLeft - PAD.padRight);
  const slot = n ? plotW / n : 0;
  const barW = Math.max(1, Math.min(24, slot * 0.62));
  const baseY = height - PAD.padBottom;

  const total = data.reduce((s, p) => s + p.value, 0);
  const peakIndex = data.reduce((best, p, i) => (p.value > data[best].value ? i : best), 0);
  const summary = n
    ? `${format(total)} ${unit} over ${n} ${data[0].date.length > 7 ? 'days' : 'months'}` +
      (max > 0 ? `; highest ${format(data[peakIndex].value)} on ${bucketLabel(data[peakIndex].date, true)}.` : '.')
    : `No ${unit} yet.`;

  // Columns are centred in their slot; a line runs point to point.
  const xOf = (i: number) => (kind === 'columns' ? PAD.padLeft + slot * i + slot / 2 : xAt(i, n, frame));
  const pick = (x: number) => {
    if (!n || !width) return;
    const i = kind === 'columns' ? Math.floor((x - PAD.padLeft) / (slot || 1)) : nearestIndex(x, n, frame);
    setActive(Math.min(Math.max(i, 0), n - 1));
  };

  const xLabels = n ? [...new Set([0, Math.floor((n - 1) / 2), n - 1])] : [];
  const linePathD = kind === 'line' && width ? linePath(data.map((p, i) => ({ x: xOf(i), y: yAt(p.value, top, frame) }))) : '';
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const shown = active !== null ? data[active] : null;

  if (!n) return <Text style={styles.empty}>No data for this period.</Text>;

  return (
    <View>
      <View style={styles.readout} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={styles.readoutValue}>{format(shown ? shown.value : total)}</Text>
        <Text style={styles.readoutLabel}>{shown ? bucketLabel(shown.date, true) : `Total, ${data[0].date.length > 7 ? `${n} days` : `${n} months`}`}</Text>
      </View>
      <View
        onLayout={onLayout}
        style={{ height }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={summary}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
        onResponderMove={(e) => pick(e.nativeEvent.locationX)}
        onResponderRelease={() => setActive(null)}
        onResponderTerminate={() => setActive(null)}
      >
        {width > 0 && (
          <Svg width={width} height={height}>
            {yTicks.map((t) => {
              const y = yAt(t, top, frame);
              return (
                <React.Fragment key={t}>
                  <Line x1={PAD.padLeft} x2={width - PAD.padRight} y1={y} y2={y} stroke={colors.lineSoft} strokeWidth={1} />
                  <SvgText x={PAD.padLeft - 6} y={y + 4} fontSize={T.micro.fontSize} fill={colors.inkFaint} textAnchor="end">
                    {compact(t)}
                  </SvgText>
                </React.Fragment>
              );
            })}
            {kind === 'columns'
              ? data.map((p, i) => {
                  const y = yAt(p.value, top, frame);
                  const h = Math.max(p.value > 0 ? 2 : 0, baseY - y);
                  const isNow = i === n - 1;
                  const dim = active !== null ? i !== active : !isNow;
                  return (
                    <Rect
                      key={p.date}
                      x={xOf(i) - barW / 2}
                      y={baseY - h}
                      width={barW}
                      height={h}
                      rx={Math.min(3, barW / 2)}
                      fill={colors.accent}
                      opacity={dim ? 0.55 : 1}
                    />
                  );
                })
              : <Path d={linePathD} stroke={colors.accent} strokeWidth={2} fill="none" />}
            {active !== null && (
              <Line x1={xOf(active)} x2={xOf(active)} y1={PAD.padTop} y2={baseY} stroke={colors.inkFaint} strokeWidth={1} />
            )}
            <Line x1={PAD.padLeft} x2={width - PAD.padRight} y1={baseY} y2={baseY} stroke={colors.line} strokeWidth={1} />
            {xLabels.map((i) => (
              <SvgText
                key={`x${i}`}
                x={Math.min(Math.max(xOf(i), PAD.padLeft + 14), width - PAD.padRight - 14)}
                y={height - 6}
                fontSize={T.micro.fontSize}
                fill={colors.inkFaint}
                textAnchor="middle"
              >
                {bucketLabel(data[i].date)}
              </SvgText>
            ))}
          </Svg>
        )}
      </View>
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    readout: { flexDirection: 'row', alignItems: 'baseline', gap: S.sm, marginBottom: S.sm },
    readoutValue: { ...T.heading, color: c.ink, fontVariant: ['tabular-nums'] },
    readoutLabel: { ...T.caption, color: c.inkMuted },
    empty: { ...T.body, color: c.inkMuted, paddingVertical: S.md },
  });

export default TrendChart;
