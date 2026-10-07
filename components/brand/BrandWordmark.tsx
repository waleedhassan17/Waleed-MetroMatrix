import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

import { modulePalette, T, useTheme } from '../../theme';

/**
 * "MetroMatrix" set the way the logo sets it: "Metro" in ink, "Matrix" in the
 * brand green.
 *
 * It reads the `brand` palette directly rather than `colors.accent`, so it is
 * the brand wherever it is mounted — the boot frame sits outside every route's
 * ThemeProvider, and a vertical's screen would otherwise turn it blue or orange.
 *
 *   display   the splash. `T.display` is large text, and the brand `accent`
 *             (#047857) measures 5.25:1 on paper — AA even at body size.
 *   compact   a bar or a header. At `T.subhead` it is body text, so it takes
 *             `accentDeep`, the slot that is guaranteed as text.
 */
export interface BrandWordmarkProps {
  variant?: 'display' | 'compact';
  style?: StyleProp<TextStyle>;
}

const BrandWordmark: React.FC<BrandWordmarkProps> = ({ variant = 'display', style }) => {
  const { colors, mode } = useTheme();
  const brand = modulePalette('brand', mode);
  const display = variant === 'display';

  return (
    <Text
      style={[display ? T.display : T.subhead, { color: colors.ink }, style]}
      accessibilityLabel="MetroMatrix"
      numberOfLines={1}
    >
      Metro
      <Text style={{ color: display ? brand.accent : brand.accentDeep }}>Matrix</Text>
    </Text>
  );
};

export default BrandWordmark;
