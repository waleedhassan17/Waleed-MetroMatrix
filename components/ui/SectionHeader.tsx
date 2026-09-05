import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { S, T } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';
import { uiAccent } from './accentCompat';

/**
 * Section heading, optionally with one trailing action.
 *
 * Sentence case, no ALL-CAPS eyebrow above it, no decorative accent bar. The
 * action is only rendered when it has somewhere to go — a "See All" that does
 * nothing is worse than no "See All".
 */
export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(
    () => makeStyles(colors, uiAccent(colors, isDark).accentDeep),
    [colors, isDark],
  );

  return (
  <View style={[styles.row, style]}>
    <View style={styles.titles}>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    {!!actionLabel && !!onAction && (
      <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.action}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
  );
};

const makeStyles = (c: ThemeColors, action: string) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  titles: { flex: 1 },
  title: {
    ...T.heading,
    color: c.ink,
  },
  subtitle: {
    ...T.caption,
    color: c.inkMuted,
    marginTop: 2,
  },
  action: {
    ...T.label,
    color: action,
    marginLeft: S.md,
  },
});

export default SectionHeader;
