// ============================================================================
// Splash
//
// A short brand moment on the same warm paper ground as the rest of the app, so
// splash, onboarding and the product read as one surface rather than three.
//
// The accent rule under the wordmark runs home-service green -> healthcare blue
// -> shopping orange. MetroMatrix has no single brand colour and inventing one
// would contradict `theme/palettes.ts`, which is explicit that the app before a
// vertical claims it is ink. The three accents together are the mark.
//
// WHY ONE ANIMATED SEQUENCE AND NO TIMERS
// ---------------------------------------
// Timers cannot be composed, and one that survives an unmount navigates a
// screen that is no longer there. This is a single `Animated.sequence` — it
// stops on unmount, and the navigation hangs off its completion callback
// instead of a wall clock.
//
// The accent rule scales rather than animating `width`: `width` is not
// supported by the native driver, and one JS-driven node forces every other
// node on the same view onto the JS driver with it.
// ============================================================================

import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import Screen from '../../../components/ui/Screen';
import useReducedMotion from '../../../hooks/useReducedMotion';
import { C, MODULE_PALETTES, S, T, tint } from '../../../theme';

const RULE_WIDTH = 72;

/** The three verticals, in the order the onboarding slides introduce them. */
const SPECTRUM: [string, string, string] = [
  MODULE_PALETTES.homeservice.accent,
  MODULE_PALETTES.healthcare.accent,
  MODULE_PALETTES.shopping.accent,
];

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const reduced = useReducedMotion();

  const ruleOpacity = useRef(new Animated.Value(0)).current;
  const ruleScale = useRef(new Animated.Value(0)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordY = useRef(new Animated.Value(12)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const tagY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    const go = () => navigation.replace('Onboarding');

    // Someone who asked the system for less movement still needs to get past
    // this screen — so jump to the end state and hold briefly, rather than
    // freezing at the start state with nothing visible.
    if (reduced) {
      ruleOpacity.setValue(1);
      ruleScale.setValue(1);
      wordOpacity.setValue(1);
      wordY.setValue(0);
      tagOpacity.setValue(1);
      tagY.setValue(0);

      const hold = Animated.delay(600);
      hold.start(({ finished }) => finished && go());
      return () => hold.stop();
    }

    const reveal = Animated.sequence([
      Animated.stagger(150, [
        Animated.parallel([
          Animated.timing(ruleOpacity, { toValue: 1, duration: 320, easing: ease, useNativeDriver: true }),
          Animated.timing(ruleScale, { toValue: 1, duration: 460, easing: ease, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(wordOpacity, { toValue: 1, duration: 420, easing: ease, useNativeDriver: true }),
          Animated.timing(wordY, { toValue: 0, duration: 420, easing: ease, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(tagOpacity, { toValue: 1, duration: 380, easing: ease, useNativeDriver: true }),
          Animated.timing(tagY, { toValue: 0, duration: 380, easing: ease, useNativeDriver: true }),
        ]),
      ]),
      Animated.delay(340),
    ]);

    reveal.start(({ finished }) => finished && go());
    return () => reveal.stop();
  }, [navigation, reduced, ruleOpacity, ruleScale, tagOpacity, tagY, wordOpacity, wordY]);

  return (
    <Screen background={C.bg} barStyle="dark-content" edges={['top', 'bottom']}>
      {/* Static geometry. It gives the ground some depth without asking for
          attention, so nothing here moves. */}
      <View style={s.decorRing} />
      <View style={s.decorDisc} />

      <View style={s.content}>
        <Animated.View
          style={[s.rule, { opacity: ruleOpacity, transform: [{ scaleX: ruleScale }] }]}
        >
          <LinearGradient
            colors={SPECTRUM}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={s.ruleFill}
          />
        </Animated.View>

        <Animated.Text
          style={[s.wordmark, { opacity: wordOpacity, transform: [{ translateY: wordY }] }]}
          accessibilityRole="header"
        >
          MetroMatrix
        </Animated.Text>

        <Animated.Text
          style={[s.tagline, { opacity: tagOpacity, transform: [{ translateY: tagY }] }]}
        >
          Smart City Services
        </Animated.Text>
      </View>
    </Screen>
  );
};

export default SplashScreen;

const s = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  decorRing: {
    position: 'absolute',
    top: '12%',
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  decorDisc: {
    position: 'absolute',
    bottom: '14%',
    left: -56,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: tint(C.ink, 0.02),
  },

  rule: {
    width: RULE_WIDTH,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: S.xxl,
  },
  ruleFill: { flex: 1 },

  wordmark: { ...T.display, color: C.ink, marginBottom: S.sm },
  tagline: { ...T.body, color: C.inkMuted },
});
