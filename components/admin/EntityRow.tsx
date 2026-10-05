import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Avatar, ToneBadge, toneColours } from '../ui';
import type { Tone } from '../../constants/theme';
import { S, T, useTheme, type ThemeColors } from '../../theme';

/**
 * One person, request or record in a list: who/what, one line of context, and
 * on the trailing edge its status badge and how long it has waited (or an
 * amount). The whole row is the tap target (at least 64 pt high).
 *
 * `urgency` paints a thin edge on the leading side for work that has waited
 * too long; the badge or meta text still says why, so colour is never the
 * only signal.
 */
export interface EntityRowProps {
  title: string;
  subtitle?: string | null;
  /** Trailing secondary text: an age ("3 h"), an amount. */
  meta?: string | null;
  /** Colours the meta text — an age past its limit is `warning` or `error`. */
  metaTone?: 'warning' | 'error' | null;
  badge?: { label: string; tone: Tone } | null;
  avatar?: { name?: string | null; uri?: string | null };
  /** Ionicons glyph in a round well; `iconTone` tints the well. */
  icon?: string;
  iconTone?: Tone;
  urgency?: 'warning' | 'error' | null;
  onPress?: () => void;
  onLongPress?: () => void;
  divider?: boolean;
  accessibilityLabel?: string;
}

const EntityRow: React.FC<EntityRowProps> = ({
  title,
  subtitle,
  meta,
  metaTone,
  badge,
  avatar,
  icon,
  iconTone,
  urgency,
  onPress,
  onLongPress,
  divider = true,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const well = iconTone ? toneColours(colors, iconTone) : { ground: colors.surfaceSunken, ink: colors.inkMuted };
  const metaColor = metaTone === 'error' ? colors.error : metaTone === 'warning' ? colors.warning : colors.inkMuted;

  const content = (
    <>
      {!!urgency && <View style={[styles.edge, { backgroundColor: urgency === 'error' ? colors.error : colors.warning }]} />}
      {avatar ? (
        <Avatar name={avatar.name} uri={avatar.uri} size={40} style={styles.leading} />
      ) : icon ? (
        <View style={[styles.leading, styles.iconWell, { backgroundColor: well.ground }]}>
          <Ionicons name={icon as any} size={20} color={well.ink} />
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
      </View>
      <View style={styles.trailing}>
        <View style={styles.trailingText}>
          {!!badge && <ToneBadge label={badge.label} tone={badge.tone} />}
          {!!meta && <Text style={[styles.meta, { color: metaColor }]}>{meta}</Text>}
        </View>
        {!!onPress && <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />}
      </View>
    </>
  );

  const a11y = accessibilityLabel ?? [title, subtitle, badge?.label, meta].filter(Boolean).join(', ');
  const rowStyle = [styles.row, divider && styles.divider];
  return onPress || onLongPress ? (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [...rowStyle, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
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
    edge: { position: 'absolute', left: -S.md, top: S.sm, bottom: S.sm, width: 3, borderRadius: 2 },
    leading: { marginRight: S.md },
    iconWell: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, minWidth: 0 },
    title: { ...T.subhead, color: c.ink },
    subtitle: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    trailing: { flexDirection: 'row', alignItems: 'center', gap: S.xs, marginLeft: S.sm, flexShrink: 0, maxWidth: '45%' },
    trailingText: { alignItems: 'flex-end', gap: S.xs },
    meta: { ...T.caption, fontVariant: ['tabular-nums'] },
  });

export default EntityRow;
