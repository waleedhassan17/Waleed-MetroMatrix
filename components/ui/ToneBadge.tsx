import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { R, S, T, Tone } from '../../constants/theme';
import { ThemeColors, useTheme } from '../../theme';

/**
 * A small status label in one of the theme's tones — "Awaiting approval",
 * "Closed", "Video".
 *
 * Five doctor screens each declared their own status colour map, and they
 * disagreed: "completed" was blue on one screen, grey on another and green on
 * a third. The tone comes from utils/healthcare/doctorFormat, once.
 */
export interface ToneBadgeProps {
  label: string;
  tone?: Tone;
  /** Ionicons glyph before the label. */
  icon?: string;
  style?: StyleProp<ViewStyle>;
}

const ToneBadge: React.FC<ToneBadgeProps> = ({ label, tone = 'neutral', icon, style }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { ground, ink } = toneColours(colors, tone);

  return (
    <View style={[styles.badge, { backgroundColor: ground }, style]}>
      {!!icon && <Ionicons name={icon as any} size={12} color={ink} style={styles.icon} />}
      <Text style={[styles.label, { color: ink }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

export function toneColours(c: ThemeColors, tone: Tone): { ground: string; ink: string } {
  switch (tone) {
    case 'success':
      return { ground: c.successSoft, ink: c.success };
    case 'warning':
      return { ground: c.warningSoft, ink: c.warning };
    case 'error':
      return { ground: c.errorSoft, ink: c.error };
    case 'info':
      return { ground: c.infoSoft, ink: c.info };
    case 'accent':
      return { ground: c.accentSoft, ink: c.accentDeep };
    default:
      return { ground: c.surfaceSunken, ink: c.inkMuted };
  }
}

const makeStyles = (_c: ThemeColors) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderRadius: R.chip,
      paddingHorizontal: S.sm,
      paddingVertical: 3,
    },
    icon: { marginRight: 4 },
    label: { ...T.micro },
  });

export default ToneBadge;
