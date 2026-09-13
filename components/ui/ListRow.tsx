import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { F, R, S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';

/**
 * One row of a settings-style list: an icon, a title, an optional subtitle,
 * and a trailing value, badge or chevron.
 *
 * Account menus were built as a grid of ten equal tiles, which gives every
 * destination the same weight and no room to say what it is. A list scans
 * top to bottom and can carry a subtitle.
 */
export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Ionicons glyph, shown in a small tinted square. */
  icon?: string;
  tone?: 'neutral' | 'accent' | 'error';
  /** Short trailing text, e.g. "3 days". */
  value?: string;
  /** A count, e.g. unread messages. Hidden at 0. */
  badge?: number;
  /** Anything richer than a value — a Switch. Wins over `value`. */
  right?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** A hairline above the row, for rows stacked inside one card. */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  icon,
  tone = 'neutral',
  value,
  badge,
  right,
  onPress,
  disabled,
  divider,
  style,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const iconColor = tone === 'accent' ? colors.accentDeep : tone === 'error' ? colors.error : colors.inkMuted;
  const iconGround = tone === 'accent' ? colors.accentSoft : tone === 'error' ? colors.errorSoft : colors.surfaceSunken;
  const titleColor = tone === 'error' ? colors.error : colors.ink;

  const body = (
    <>
      {!!icon && (
        <View style={[styles.icon, { backgroundColor: iconGround }]}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
      )}
      <View style={styles.text}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {right ?? (
        <>
          {!!badge && badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
          {!!value && (
            <Text style={styles.value} numberOfLines={1}>
              {value}
            </Text>
          )}
          {!!onPress && <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />}
        </>
      )}
    </>
  );

  const shell = [styles.row, divider && styles.divider, disabled && styles.disabled, style];

  if (!onPress) return <View style={shell}>{body}</View>;

  return (
    <TouchableOpacity
      style={shell}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}. ${subtitle}` : title)}
      accessibilityState={{ disabled: !!disabled }}
    >
      {body}
    </TouchableOpacity>
  );
};

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
      paddingVertical: S.md,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
    },
    disabled: { opacity: 0.5 },
    icon: {
      width: 36,
      height: 36,
      borderRadius: R.control,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: S.md,
    },
    text: { flex: 1, marginRight: S.sm },
    title: { ...T.subhead },
    subtitle: { ...T.caption, color: c.inkMuted, marginTop: 2 },
    value: { ...T.label, color: c.inkMuted, marginRight: S.xs, maxWidth: 140 },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: R.pill,
      paddingHorizontal: 6,
      backgroundColor: c.error,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: S.xs,
    },
    badgeText: { ...T.micro, fontFamily: F.bold, color: c.inkInverse },
  });

export default ListRow;
