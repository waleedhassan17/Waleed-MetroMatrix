import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import {
  Platform,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GUTTER, R, S, T, W } from '../../constants/theme';
import { darkShift } from '../../constants/darkShift';
import { textOn, ThemeColors, useTheme } from '../../theme';
import BackButton from './BackButton';

/**
 * The one page header.
 *
 * TWO TONES, CHOSEN BY THE MODULE — NOT BY THE SCREEN
 * ---------------------------------------------------
 * `surface` is the card ground with an ink title — white in light, near-black
 * in dark. `accent` paints the bar in the module's own colour. In dark, no
 * module asks for that (a saturated band across the top of a dark screen reads
 * as a flare, and `accentDeep` inverts to a LIGHT tone there), so a screen that
 * asks for it explicitly gets the deep tinted `accentSoft` instead.
 *
 * Which one a module uses lives in its palette
 * (`barTone`), so every screen in a vertical agrees without being told; a
 * screen may still override it, but the default is not its decision. Seventeen
 * hand-rolled headers that each answered this differently is the thing this
 * component exists to end.
 *
 * WHY `accentDeep` AND NOT `accent`
 * ---------------------------------
 * An accent is picked to read AS text on white. It is usually too light to sit
 * BEHIND text. Home services is the worked example: white on the module accent
 * `#059669` measures 3.77:1 and fails WCAG AA for body text; on `accentDeep`
 * `#047857` it measures 5.48:1 and passes. The subtitle is white at 90% —
 * 4.78:1, still AA — rather than the 70% that would look right and measure 3.1.
 *
 * Nothing here is hardcoded to green: it reads whatever the enclosing module or
 * brand resolves to, and picks its ink with the same contrast helper the brand
 * theme editor uses.
 */
export interface AppBarProps {
  title?: string;
  subtitle?: string;
  /** Hide the back chevron on a tab root. */
  hideBack?: boolean;
  onBack?: () => void;
  /** Ionicons glyph for the trailing action. */
  rightIcon?: string;
  onRightPress?: () => void;
  /** Unread count on the trailing action. Hidden at 0. */
  rightBadge?: number;
  /** Anything richer than a single icon. Wins over `rightIcon`. */
  right?: React.ReactNode;
  /** Drop the bottom rule when the content below provides its own edge. */
  borderless?: boolean;
  /**
   * Override the module's bar tone for this screen. Use sparingly — a header
   * that changes between two screens of the same flow reads as a bug.
   */
  tone?: 'surface' | 'accent' | 'gradient';
  style?: StyleProp<ViewStyle>;
}

const AppBar: React.FC<AppBarProps> = ({
  title,
  subtitle,
  hideBack,
  onBack,
  rightIcon,
  onRightPress,
  rightBadge,
  right,
  borderless,
  tone,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // In dark, no module asks for an accent bar (see palettes.ts) — but a screen
  // still can, per `tone`. It gets the module's deep tinted ground rather than
  // the light accent: `accentDeep` inverts to a LIGHT tone on dark, and a
  // bright band across the top of a dark screen is not a header, it is a flare.
  const resolved = tone ?? colors.barTone;

  // The module-page header, modelled on the healthcare screens: a diagonal
  // accent gradient, a soft bottom radius, and a large leading title with its
  // subtitle underneath. 25 of healthcare's 28 customer screens build this by
  // hand; this is that shape as one component, so the two modules stop
  // disagreeing about what a header is.
  //
  // It is a taller, louder header than `accent`, and that is the point — it
  // announces the section. Use it on a module's own pages, not on a sheet.
  if (resolved === 'gradient') {
    const ink = textOn(colors.accentDeep, colors.ink, colors.inkInverse);
    // ONE surface, from the very top of the screen. The status-bar inset used
    // to live on a wrapper painted flat `accentDeep`, with the gradient
    // starting below it at the lighter `accent` — so every header read as two
    // blocks: a dark strip under the clock and a lighter band under that (and
    // in dark mode `accentDeep` inverts light, so the strip glared). The
    // gradient now carries the inset itself, exactly as healthcare's
    // hand-built headers do, and owns the rounded bottom.
    return (
      <LinearGradient
        // Mixed into the dark surface in dark mode rather than laid on top
        // of it — a saturated band across the top of a dark screen is a
        // flare, not a header.
        colors={darkShift(mode).grad([colors.accent, colors.accentDeep])}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientFill, { paddingTop: insets.top + S.xl }, style]}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.gradientRow}>
          {!hideBack && <BackButton tone="onAccent" onPress={onBack ?? (() => {})} />}
          <View style={styles.gradientText}>
            {!!title && (
              <Text style={[styles.gradientTitle, { color: ink }]} numberOfLines={1}>
                {title}
              </Text>
            )}
            {!!subtitle && (
              <Text
                style={[styles.gradientSubtitle, { color: colors.inkInverseSoft }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
          {right ??
            (rightIcon ? (
              <TouchableOpacity
                onPress={onRightPress}
                style={styles.iconButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
              >
                <Ionicons name={rightIcon as any} size={22} color={ink} />
                {!!rightBadge && rightBadge > 0 && (
                  <View style={[styles.badge, { borderWidth: 2, borderColor: colors.accentDeep }]}>
                    <Text style={styles.badgeText}>{rightBadge > 9 ? '9+' : rightBadge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : null)}
        </View>
      </LinearGradient>
    );
  }

  const accented = resolved === 'accent';
  const ground = accented ? (isDark ? colors.accentSoft : colors.accentDeep) : colors.surface;
  const ink = accented ? textOn(ground, colors.ink, colors.inkInverse) : colors.ink;
  // Hierarchy by opacity is only safe here because the value was measured.
  const inkSoft = accented && !isDark ? colors.inkInverseSoft : colors.inkMuted;

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top + S.sm, backgroundColor: ground },
        // A coloured bar is its own edge. A rule on top of it is a seam.
        !accented && !borderless && styles.ruled,
        style,
      ]}
    >
      {/* Mounted after <Screen>'s StatusBar, so this wins — the status icons
          have to flip to light or they disappear into a dark bar. */}
      <StatusBar
        barStyle={isDark || accented ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.slot}>
        {/* The same component every hand-rolled header now uses, so there is
            one implementation rather than two that happen to agree today. */}
        {!hideBack && <BackButton onPress={onBack ?? (() => {})} color={ink} />}
      </View>

      <View style={styles.titles} pointerEvents="none">
        {!!title && (
          <Text style={[styles.title, { color: ink }]} numberOfLines={1}>
            {title}
          </Text>
        )}
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: inkSoft }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={[styles.slot, styles.slotEnd]}>
        {right ??
          (rightIcon ? (
            <TouchableOpacity
              onPress={onRightPress}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
            >
              <Ionicons name={rightIcon as any} size={22} color={ink} />
              {!!rightBadge && rightBadge > 0 && (
                // On a coloured bar the red badge loses its edge against the
                // ground, so it gets a ring in the bar's own colour.
                <View
                  style={[styles.badge, accented && { borderWidth: 2, borderColor: ground }]}
                >
                  <Text style={styles.badgeText}>{rightBadge > 9 ? '9+' : rightBadge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : null)}
      </View>
    </View>
  );
};

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER - S.sm,
    paddingBottom: S.md,
  },
  ruled: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.line,
  },

  // ── gradient tone ─────────────────────────────────────────────────────────
  // The gradient runs under the status bar (its top inset is added inline)
  // and owns the rounded bottom, so the header is one continuous surface.
  gradientFill: {
    paddingHorizontal: GUTTER,
    // S.xl above the title and S.xxxl below it, which is healthcare's header
    // exactly (STATUS_BAR_HEIGHT + 20 / 32). These two were briefly trimmed to
    // 12 and 24 while fixing the two-tone seam, but that seam came from the
    // inset being painted on a second view — the header's height was never the
    // cause, and trimming both left it 16pt shorter than the thing it is meant
    // to match.
    paddingBottom: S.xxxl,
    borderBottomLeftRadius: R.sheet,
    borderBottomRightRadius: R.sheet,
    overflow: 'hidden',
  },
  gradientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
  },
  gradientText: {
    flex: 1,
  },
  // Large and leading. A centred 18pt title in a header this tall reads as a
  // label floating in a coloured field; the page's own name should lead it.
  gradientTitle: {
    ...T.title,
  },
  gradientSubtitle: {
    ...T.label,
    marginTop: S.xs,
  },
  // Equal-width side slots keep the title optically centred whether or not
  // there is a trailing action.
  slot: {
    width: 40,
    alignItems: 'flex-start',
  },
  slotEnd: {
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    ...T.barTitle,
  },
  // 13, matching the subtitle under healthcare's and shopping's headers. At
  // `caption` (12) it sat a size below both.
  subtitle: {
    ...T.label,
    marginTop: 1,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: c.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...T.micro,
    fontWeight: W.bold,
    color: c.inkInverse,
    lineHeight: Platform.OS === 'ios' ? 13 : 14,
  },
});

export default AppBar;
