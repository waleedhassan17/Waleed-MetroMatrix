import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Avatar, ToneBadge } from '../ui';
import type { Tone } from '../../constants/theme';
import { S, T, useTheme, type ThemeColors } from '../../theme';

/**
 * One person, request or record in a list: who/what, one line of context, a
 * status badge and how long it has waited. The whole row is the tap target
 * (at least 64 pt high).
 */
export interface EntityRowProps {
  title: string;
  subtitle?: string | null;
  /** Right-aligned secondary text: an age ("3 h"), an amount. */
  meta?: string | null;
  badge?: { label: string; tone: Tone } | null;
  avatar?: { name?: string | null; uri?: string | null };
  icon?: string;
  onPress?: () => void;
  divider?: boolean;
  accessibilityLabel?: string;
}

const EntityRow: React.FC<EntityRowProps> = ({ title, subtitle, meta, badge, avatar, icon, onPress, divider = true, accessibilityLabel }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const content = (
    <>
      {avatar ? (
        <Avatar name={avatar.name} uri={avatar.uri} size={40} style={styles.leading} />
      ) : icon ? (
        <View style={[styles.leading, styles.iconWell]}>
          <Ionicons name={icon as any} size={20} color={colors.inkMuted} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        {!!badge && <ToneBadge label={badge.label} tone={badge.tone} style={styles.badge} />}
      </View>
      <View style={styles.trailing}>
        {!!meta && <Text style={styles.meta}>{meta}</Text>}
        {!!onPress && <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />}
      </View>
    </>
  );

  const a11y = accessibilityLabel ?? [title, subtitle, badge?.label, meta].filter(Boolean).join(', ');
  const rowStyle = [styles.row, divider && styles.divider];
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [...rowStyle, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={a11y}>
      {content}
    </Pressable>
  ) : (
    <View style={rowStyle} accessible accessibilityLabel={a11y}>
      {content}
    </View>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingVertical: S.md },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    pressed: { backgroundColor: c.surfaceSunken },
    leading: { marginRight: S.md },
    iconWell: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceSunken },
    body: { flex: 1, minWidth: 0 },
    title: { ...T.subhead, color: c.ink },
    subtitle: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    badge: { marginTop: S.xs, alignSelf: 'flex-start' },
    trailing: { flexDirection: 'row', alignItems: 'center', gap: S.xs, marginLeft: S.sm },
    meta: { ...T.caption, color: c.inkMuted, fontVariant: ['tabular-nums'] },
  });

export default EntityRow;
