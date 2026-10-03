import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { R, S, T, useTheme, type ThemeColors } from '../../theme';

/**
 * A ranked list with one bar per row: label, value written out, and a single-
 * hue bar scaled to the largest row. Replaces the donut charts — a reader
 * compares lengths far better than angles, and every value is labelled
 * directly instead of through a colour legend.
 */
export interface BarListItem {
  key: string;
  label: string;
  value: number;
  /** The value as shown, e.g. "PKR 12,400". */
  display: string;
  /** Secondary text under the label, e.g. "38 appointments". */
  detail?: string;
}

const BarList: React.FC<{ items: BarListItem[]; emptyText?: string }> = ({ items, emptyText = 'No data for this period.' }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const max = Math.max(...items.map((i) => i.value), 0);

  if (!items.length) return <Text style={styles.empty}>{emptyText}</Text>;

  return (
    <View>
      {items.map((item) => (
        <View key={item.key} style={styles.row} accessible accessibilityLabel={`${item.label}: ${item.display}${item.detail ? `, ${item.detail}` : ''}`}>
          <View style={styles.text}>
            <Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={styles.value}>{item.display}</Text>
          </View>
          {!!item.detail && <Text style={styles.detail}>{item.detail}</Text>}
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${max > 0 ? Math.max(2, (item.value / max) * 100) : 0}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { paddingVertical: S.sm },
    text: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: S.md },
    label: { ...T.body, color: c.ink, flex: 1 },
    value: { ...T.bodyStrong, color: c.ink, fontVariant: ['tabular-nums'] },
    detail: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    track: { height: 6, borderRadius: R.control, backgroundColor: c.surfaceSunken, marginTop: S.xs, overflow: 'hidden' },
    bar: { height: 6, borderRadius: R.control, backgroundColor: c.accent },
    empty: { ...T.body, color: c.inkMuted, paddingVertical: S.md },
  });

export default BarList;
