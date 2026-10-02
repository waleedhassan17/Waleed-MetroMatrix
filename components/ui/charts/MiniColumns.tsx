// ============================================================================
// A week of daily values as columns — for "expected demand" cards.
//
// One series, one colour (slot 1). Columns ≤ 24px with a 4px rounded top and
// a square baseline; only the busiest day carries a value label; tap any
// column to read its value. Day initials sit under the baseline.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CHART, S, T } from '../../../constants/theme';
import { ThemeColors, useTheme } from '../../../theme';
import { compact } from './geometry';

export interface MiniColumnsProps {
  data: { label: string; value: number }[];
  height?: number;
  unit?: string;
}

export default function MiniColumns({ data, height = 64, unit = '' }: MiniColumnsProps) {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const series = CHART[mode === 'dark' ? 'dark' : 'light'].series[0];
  const [picked, setPicked] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

  return (
    <View accessibilityRole="summary" accessibilityLabel={data.map((d) => `${d.label} ${compact(d.value)}${unit ? ` ${unit}` : ''}`).join(', ')}>
      <View style={[styles.plot, { height }]}>
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * (height - 16));
          const showValue = i === picked || (picked === null && i === peak && d.value > 0);
          return (
            <TouchableOpacity
              key={`${d.label}${i}`}
              style={styles.slot}
              onPress={() => setPicked(i === picked ? null : i)}
              accessibilityRole="button"
              accessibilityLabel={`${d.label}: ${compact(d.value)} ${unit}`}
              hitSlop={{ top: 8, bottom: 8 }}
            >
              {showValue && <Text style={styles.value}>{compact(Math.round(d.value * 10) / 10)}</Text>}
              <View style={[styles.col, { height: h, backgroundColor: series, opacity: picked === null || picked === i ? 1 : 0.45 }]} />
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text key={`l${i}`} style={styles.label}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    plot: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: c.lineSoft },
    slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', marginHorizontal: 1 },
    col: { width: '62%', maxWidth: 24, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    value: { ...T.micro, color: c.ink, marginBottom: 2 },
    labels: { flexDirection: 'row', marginTop: S.xs },
    label: { ...T.micro, color: c.inkFaint, flex: 1, textAlign: 'center' },
  });
