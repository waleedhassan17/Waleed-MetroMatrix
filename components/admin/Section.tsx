import React, { useMemo } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Card } from '../ui';
import { S, SECTION, T, useTheme, type ThemeColors } from '../../theme';

/**
 * A titled block of a screen. `card` puts the content on a bordered surface
 * (lists, key–value details); without it the content sits on the page (tiles).
 * `count` sits beside the title ("Waiting · 12"); `onSeeAll` adds a "See all"
 * link that opens the full list.
 */
export interface SectionProps {
  title: string;
  /** What the figures cover, or how many: "Month to date", "12 waiting". */
  caption?: string;
  count?: number | null;
  action?: React.ReactNode;
  onSeeAll?: () => void;
  seeAllLabel?: string;
  card?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, caption, count, action, onSeeAll, seeAllLabel = 'See all', card, style, children }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.section, style]}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <View style={styles.titleRow}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {typeof count === 'number' && (
              <View style={styles.count}>
                <Text style={styles.countText}>{count.toLocaleString('en-PK')}</Text>
              </View>
            )}
          </View>
          {!!caption && <Text style={styles.caption}>{caption}</Text>}
        </View>
        {action}
        {!!onSeeAll && (
          <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="link" accessibilityLabel={`${seeAllLabel}: ${title}`}>
            <Text style={styles.seeAll}>{seeAllLabel}</Text>
          </Pressable>
        )}
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
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
    title: { ...T.subhead, color: c.ink },
    count: { minWidth: 22, paddingHorizontal: S.xs + 2, paddingVertical: 1, borderRadius: 11, backgroundColor: c.surfaceSunken, alignItems: 'center' },
    countText: { ...T.micro, color: c.inkMuted, fontVariant: ['tabular-nums'] },
    caption: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    seeAll: { ...T.bodyStrong, color: c.accentDeep },
    card: { paddingVertical: S.xs },
    detail: { flexDirection: 'row', justifyContent: 'space-between', gap: S.lg, paddingVertical: S.md },
    detailDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    detailLabel: { ...T.body, color: c.inkMuted },
    detailValue: { ...T.body, color: c.ink, flexShrink: 1, textAlign: 'right' },
  });

export default Section;
