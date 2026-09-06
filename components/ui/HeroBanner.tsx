import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { darkShift } from '../../constants/darkShift';
import { HS } from '../../constants/HomeServiceTheme';
import { C, GUTTER, PROSE_WIDTH, R, S, T } from '../../constants/theme';
import { useTheme } from '../../theme';

/**
 * THE hero. The only place in home services that uses the brand gradient.
 *
 * There were 132 LinearGradients across these screens — on headers, avatars,
 * rating badges, section-icon chips, stat tiles and every button. Once gradient
 * is the base surface it stops signalling anything, so the whole budget is
 * spent here, once, on the moment that has earned emphasis: a booking
 * confirmed.
 *
 * If you are reaching for this component on a second screen, the answer is a
 * Card.
 */
export interface HeroBannerProps {
  /** Ionicons glyph shown in the badge above the title. */
  icon?: string;
  title: string;
  message?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ icon, title, message, children, style }) => {
  const { mode } = useTheme();
  // In light this returns HS.heroGradient unchanged, byte for byte. In dark it
  // mixes the stops down into the dark surface: the point of a hero is emphasis,
  // and a full-brightness green ramp on a dark page is not emphasis, it is a
  // lamp. The white text and the translucent badge still read against the
  // mixed-down stops, which is why they are unchanged below.
  const gradient = useMemo(() => darkShift(mode).grad(HS.heroGradient), [mode]);

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, style]}
    >
      {!!icon && (
        <View style={styles.badge}>
          <Ionicons name={icon as any} size={28} color={C.inkInverse} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.message}>{message}</Text>}
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  hero: {
    borderRadius: R.sheet,
    paddingVertical: S.xxxl,
    paddingHorizontal: GUTTER,
    alignItems: 'center',
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.lg,
  },
  title: {
    ...T.title,
    color: C.inkInverse,
    textAlign: 'center',
  },
  message: {
    ...T.body,
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'center',
    marginTop: S.sm,
    maxWidth: PROSE_WIDTH,
  },
});

export default HeroBanner;
