import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { R, S, T, useTheme, type ThemeColors } from '../../theme';

/**
 * A ranked list with one bar per row: label, value written out, and a single-
 * hue bar scaled to the largest row. Replaces the donut charts — a reader
 * compares lengths far better than angles, and every value is labelled
 * directly instead of through a colour legend.
 *
 * A row with `onPress` opens what it stands for (a provider, a brand).
 * `maxRows` shows the top rows with a "Show all" toggle for the rest.
 */
export interface BarListItem {
  key: string;
  label: string;
  value: number;
  /** The value as shown, e.g. "PKR 12,400". */
  display: string;
  /** Secondary text under the label, e.g. "38 appointments". */
  detail?: string;
  onPress?: () => void;
}

interface BarListProps {
  items: BarListItem[];
  emptyText?: string;
  maxRows?: number;
}

const BarList: React.FC<BarListProps> = ({ items, emptyText = 'No data for this period.', maxRows }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const max = Math.max(...items.map((i) => i.value), 0);

  if (!items.length) return <Text style={styles.empty}>{emptyText}</Text>;

  const limited = !!maxRows && items.length > maxRows && !expanded;
  const shown = limited ? items.slice(0, maxRows) : items;

  return (
    <View>
      {shown.map((item) => {
        const a11y = `${item.label}: ${item.display}${item.detail ? `, ${item.detail}` : ''}`;
        const body = (
          <>
            <View style={styles.text}>
              <Text style={[styles.label, !!item.onPress && styles.link]} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.value}>{item.display}</Text>
              {!!item.onPress && <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />}
            </View>
            {!!item.detail && <Text style={styles.detail}>{item.detail}</Text>}
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${max > 0 ? Math.max(2, (item.value / max) * 100) : 0}%` }]} />
            </View>
          </>
        );
        return item.onPress ? (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={a11y}
          >
            {body}
          </Pressable>
        ) : (
          <View key={item.key} style={styles.row} accessible accessibilityLabel={a11y}>
            {body}
          </View>
        );
      })}
      {!!maxRows && items.length > maxRows && (
        <Pressable onPress={() => setExpanded((e) => !e)} style={styles.more} accessibilityRole="button">
          <Text style={styles.moreText}>{expanded ? 'Show fewer' : `Show all ${items.length}`}</Text>
        </Pressable>
      )}
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { paddingVertical: S.sm },
    pressed: { opacity: 0.6 },
    text: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
    label: { ...T.body, color: c.ink, flex: 1 },
    link: { color: c.accentDeep },
    value: { ...T.bodyStrong, color: c.ink, fontVariant: ['tabular-nums'] },
    detail: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    track: { height: 6, borderRadius: R.control, backgroundColor: c.surfaceSunken, marginTop: S.xs, overflow: 'hidden' },
    bar: { height: 6, borderRadius: R.control, backgroundColor: c.accent },
    empty: { ...T.body, color: c.inkMuted, paddingVertical: S.md },
    more: { paddingVertical: S.sm, alignSelf: 'flex-start' },
    moreText: { ...T.bodyStrong, color: c.accentDeep },
  });

export default BarList;
