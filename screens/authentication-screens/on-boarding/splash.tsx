// ============================================================================
// Splash
//
// A short brand moment on the same warm paper ground as the rest of the app, so
// splash, onboarding and the product read as one surface rather than three.
//
// THE MARK NEVER MOVES
// --------------------
// The native splash (app.json -> assets/splash-mark.png at 104dp) and the boot
// frame in AppContainer both paint the logo tile at the exact centre of the
// window. This screen paints the same tile at the same size in the same place
// from its first frame, so the launch reads as one continuous moment: the mark
// is already there, and everything else arrives around it. That is why this
// screen insets no edges — a safe-area inset would shift the centre off the
// window's, and the tile would jump at the hand-off.
//
// The route wears the `brand` palette (navigation-maps/Base.tsx RouteModules),
// MetroMatrix's own emerald. The three verticals keep their colours in the
// footer, where they introduce what onboarding is about to show.
//
// WHY ONE ANIMATED SEQUENCE AND NO TIMERS
// ---------------------------------------
// Timers cannot be composed, and one that survives an unmount navigates a
// screen that is no longer there. This is a single `Animated.sequence` — it
// stops on unmount, and the navigation hangs off its completion callback
// instead of a wall clock. Every value is opacity or a transform, so all of it
// runs on the native driver.
// ============================================================================

import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientGlow, BrandMark, BrandWordmark, SPLASH_MARK } from '../../../components/brand';
import Screen from '../../../components/ui/Screen';
import useReducedMotion from '../../../hooks/useReducedMotion';
import {
  BRAND_GLOW,
  modulePalette,
  type ModuleName,
  S,
  T,
  ThemeColors,
  useTheme,
} from '../../../theme';

const GLOW = 320;

/** The three verticals, in the order the onboarding slides introduce them. */
const VERTICALS: { module: ModuleName; label: string }[] = [
  { module: 'homeservice', label: 'Home services' },
  { module: 'healthcare', label: 'Healthcare' },
  { module: 'shopping', label: 'Shopping' },
];

const SplashScreen: React.FC = () => {
  const { colors, mode } = useTheme();
  const s = useMemo(() => makeSheet(colors), [colors]);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.85)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordY = useRef(new Animated.Value(12)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const tagY = useRef(new Animated.Value(8)).current;
  const footOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    const go = () => navigation.replace('Onboarding');
    const fade = (v: Animated.Value, duration: number, toValue = 1) =>
      Animated.timing(v, { toValue, duration, easing: ease, useNativeDriver: true });

    // Someone who asked the system for less movement still needs to get past
    // this screen — so jump to the end state and hold briefly, rather than
    // freezing at the start state with nothing visible.
    if (reduced) {
      [glowOpacity, glowScale, wordOpacity, tagOpacity, footOpacity].forEach((v) => v.setValue(1));
      wordY.setValue(0);
      tagY.setValue(0);

      const hold = Animated.delay(600);
      hold.start(({ finished }) => finished && go());
      return () => hold.stop();
    }

    // The glow blooms behind the mark while the words arrive under it; the
    // short lead lets the light land first.
    const reveal = Animated.sequence([
      Animated.parallel([
        Animated.parallel([fade(glowOpacity, 460), fade(glowScale, 460)]),
        Animated.sequence([
          Animated.delay(120),
          Animated.stagger(140, [
            Animated.parallel([fade(wordOpacity, 420), fade(wordY, 420, 0)]),
            Animated.parallel([fade(tagOpacity, 380), fade(tagY, 380, 0)]),
            fade(footOpacity, 380),
          ]),
        ]),
      ]),
      Animated.delay(520),
    ]);

    reveal.start(({ finished }) => finished && go());
    return () => reveal.stop();
  }, [footOpacity, glowOpacity, glowScale, navigation, reduced, tagOpacity, tagY, wordOpacity, wordY]);

  return (
    <Screen edges={[]}>
      <View style={s.centre} pointerEvents="none">
        <Animated.View style={{ opacity: glowOpacity, transform: [{ scale: glowScale }] }}>
          {/* Emerald at the heart, falling off through the logo's teal. */}
          <AmbientGlow size={GLOW} color={BRAND_GLOW[0]} edge={BRAND_GLOW[1]} />
        </Animated.View>
      </View>

      <View style={s.centre}>
        <BrandMark size={SPLASH_MARK} />
      </View>

      {/* Hung from the window's centre, so the mark above it stays put. */}
      <View style={s.below}>
        <Animated.View style={{ opacity: wordOpacity, transform: [{ translateY: wordY }] }}>
          <BrandWordmark variant="display" style={s.wordmark} />
        </Animated.View>
        <Animated.Text
          style={[s.tagline, { opacity: tagOpacity, transform: [{ translateY: tagY }] }]}
        >
          Smart City Services
        </Animated.Text>
      </View>

      <Animated.View
        style={[s.footer, { bottom: insets.bottom + S.xxl, opacity: footOpacity }]}
        accessibilityLabel="Home services, healthcare and shopping"
      >
        {VERTICALS.map((v) => (
          <View key={v.module} style={s.vertical}>
            <View style={[s.dot, { backgroundColor: modulePalette(v.module, mode).accent }]} />
            <Text style={s.verticalText}>{v.label}</Text>
          </View>
        ))}
      </Animated.View>
    </Screen>
  );
};

export default SplashScreen;

const makeSheet = (c: ThemeColors) => StyleSheet.create({
  centre: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  below: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: SPLASH_MARK / 2 + S.xxl,
    alignItems: 'center',
  },
  wordmark: { marginBottom: S.xs },
  tagline: { ...T.body, color: c.inkMuted },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: S.lg,
  },
  vertical: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: S.sm },
  verticalText: { ...T.caption, color: c.inkMuted },
});
