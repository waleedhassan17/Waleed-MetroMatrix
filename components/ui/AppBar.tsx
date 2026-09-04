import { Ionicons } from '@expo/vector-icons';
import React from 'react';
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

import { C, F, GUTTER, S, T } from '../../constants/theme';
import { textOn, useTheme } from '../../theme';
import BackButton from './BackButton';

/**
 * The one page header.
 *
 * TWO TONES, CHOSEN BY THE MODULE — NOT BY THE SCREEN
 * ---------------------------------------------------
 * `surface` is a white ground with an ink title. `accent` paints the bar in the
 * module's own colour. Which one a module uses lives in its palette
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
  tone?: 'surface' | 'accent';
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
  const { colors } = useTheme();

  const accented = (tone ?? colors.barTone) === 'accent';
  const ground = accented ? colors.accentDeep : C.surface;
  const ink = accented ? textOn(ground) : C.ink;
  // Hierarchy by opacity is only safe here because the value was measured.
  const inkSoft = accented ? C.inkInverseSoft : C.inkMuted;

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
        barStyle={accented ? 'light-content' : 'dark-content'}
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

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER - S.sm,
    paddingBottom: S.md,
  },
  ruled: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
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
    ...T.subhead,
  },
  subtitle: {
    ...T.caption,
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
    backgroundColor: C.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...T.micro,
    fontFamily: F.bold,
    color: C.inkInverse,
    lineHeight: Platform.OS === 'ios' ? 13 : 14,
  },
});

export default AppBar;
