import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

import { RawIcon } from '../Icon';
import { ICONS } from '../../constants/icons';
import { useTheme } from '../../theme';

/**
 * The back control. One glyph, one size, one hit target — everywhere.
 *
 * WHY THIS EXISTS
 * ---------------
 * An audit found ~13 distinct back buttons across ~115 screens: three glyphs
 * for the same action (`chevron-back`, `arrow-back`, lucide `ChevronLeft`) at
 * four sizes, in bare targets, glass squares, outlined circles and shadowed
 * pills. Healthcare alone had one 40x40 / r14 / 18%-white style block
 * copy-pasted byte-identically into 26 files under FOUR different names, while
 * its newer screens had already drifted onto a different look — so sibling
 * screens disagreed with each other.
 *
 * WHY IT IS BARE
 * --------------
 * A container is decoration on a control every user already recognises. The
 * glass square only ever worked on a gradient hero and was unusable on a white
 * bar, which is how the app ended up needing a second treatment, then a third.
 * A bare glyph works on both grounds, so one component covers every header.
 *
 * The glyph comes from `ICONS.back` rather than a literal, because that
 * registry was built so "changing a glyph is a one-line edit here instead of a
 * repo-wide grep" — a promise nothing was keeping.
 */
export interface BackButtonProps {
  onPress: () => void;
  /**
   * `onAccent` for a coloured or gradient header, `onSurface` for a white one.
   * Only the glyph colour changes; size and hit target never do.
   */
  tone?: 'onAccent' | 'onSurface';
  /** Explicit colour, for a ground neither tone describes. Wins over `tone`. */
  color?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  tone = 'onSurface',
  color,
  style,
  accessibilityLabel = 'Go back',
}) => {
  const { colors } = useTheme();

  return (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.button, style]}
    // The 40x40 box is already a comfortable target; the slop is for the
    // screens that squeeze it against a screen edge.
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
  >
    <RawIcon
      icon={ICONS.back}
      size={24}
      color={color ?? (tone === 'onAccent' ? colors.inkInverse : colors.ink)}
    />
  </TouchableOpacity>
  );
};

/**
 * Holds the back button's 40x40 footprint where there is nothing to go back to
 * — a tab root. Header rows are `space-between` with equal-width siblings to
 * keep the title optically centred, so removing the control outright shifts the
 * title off-centre. A decorative glyph in this slot is worse still: it reads as
 * a button that does not respond.
 */
export const BackButtonSpacer: React.FC = () => <View style={styles.button} />;

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BackButton;
