import React, { useMemo } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemeColors, useTheme } from '../../theme';

/**
 * The MetroMatrix logo tile — the app icon's four-tile mark, rounded, on its
 * own cream.
 *
 * ONE FILE FOR THE NATIVE SPLASH AND THE APP
 * ------------------------------------------
 * `assets/splash-mark.png` is exactly what `app.json` hands the native splash,
 * and SPLASH_MARK is its `imageWidth`. The boot frame and the animated splash
 * paint this same file at this same size in the window's centre, so the launch
 * hands off native -> boot -> splash without the mark moving or changing.
 * Change one of the three and the hand-off shows a jump.
 *
 * The asset is the app icon's artwork with a 22.4% rounded-rect alpha mask
 * (drawn as vectors, 4x supersampled), at 512px — enough for 104pt at
 * Android's 4x.
 */
export const SPLASH_MARK = 104;

/** The corner radius baked into the PNG, as a fraction of its side. */
const CORNER = 0.224;

export interface BrandMarkProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const BrandMark: React.FC<BrandMarkProps> = ({ size = SPLASH_MARK, style }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const box = { width: size, height: size };

  return (
    <View style={[box, style]} accessibilityRole="image" accessibilityLabel="MetroMatrix logo">
      <Image
        source={require('../../assets/splash-mark.png')}
        style={box}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {/* On paper the cream tile melts into the page and the four coloured
          squares carry the mark on their own. On the dark ground the cream
          tile is the brightest thing on screen, so a hairline settles its edge. */}
      {isDark && <View style={[styles.ring, { borderRadius: size * CORNER }]} pointerEvents="none" />}
    </View>
  );
};

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
  },
});

export default BrandMark;
