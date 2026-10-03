import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Card } from '../ui';
import { S, SECTION, T, useTheme, type ThemeColors } from '../../theme';

/**
 * A titled block of a screen. `card` puts the content on a bordered surface
 * (lists, key–value details); without it the content sits on the page (tiles).
 */
export interface SectionProps {
  title: string;
  /** What the figures cover, or how many: "Month to date", "12 waiting". */
  caption?: string;
  action?: React.ReactNode;
  card?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, caption, action, card, style, children }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.section, style]}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {!!caption && <Text style={styles.caption}>{caption}</Text>}
        </View>
        {action}
      </View>
      {card ? <Card style={styles.card}>{children}</Card> : children}
    </View>
  );
};

/** A label–value line inside a card. Missing values show "—". */
export const DetailRow: React.FC<{ label: string; value?: string | null; last?: boolean }> = ({ label, value, last }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.detail, !last && styles.detailDivider]} accessible accessibilityLabel={`${label}: ${value || 'not set'}`}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} selectable>
        {value || '—'}
      </Text>
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    section: { marginBottom: SECTION },
    header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: S.sm, gap: S.md },
    titles: { flex: 1 },
    title: { ...T.subhead, color: c.ink },
    caption: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    card: { paddingVertical: S.xs },
    detail: { flexDirection: 'row', justifyContent: 'space-between', gap: S.lg, paddingVertical: S.md },
    detailDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    detailLabel: { ...T.body, color: c.inkMuted },
    detailValue: { ...T.body, color: c.ink, flexShrink: 1, textAlign: 'right' },
  });

export default Section;
