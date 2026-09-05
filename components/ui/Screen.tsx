import React from 'react';
import { StatusBar, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';

/**
 * Screen canvas: background, status bar, and real safe-area insets.
 *
 * WHY THIS EXISTS
 * ---------------
 * The home-service screens carried twelve different `StatusBar.currentHeight`
 * formulas in three mutually incompatible shapes, eight of them unguarded (so
 * iOS got Android's padding, or none). One screen applied it twice and was
 * double-padded. `StatusBar.currentHeight` is Android-only, is wrong under
 * edge-to-edge, and knows nothing about notches or the gesture bar.
 *
 * By default this applies NO top inset — `AppBar` owns that, the way
 * screens/Shopping/Brand/BrandHeader.tsx does it. A screen with no app bar
 * passes `edges={['top']}` itself.
 */
export interface ScreenProps {
  children: React.ReactNode;
  /**
   * Page ground. Defaults to the active ramp's canvas.
   *
   * Passing a literal here PINS the screen to that colour in both modes, which
   * is almost never what you want — a hardcoded `#FFFFFF` is the single most
   * common way a screen ends up white inside a dark app. Pass a theme colour,
   * or nothing at all.
   */
  background?: string;
  /**
   * Status-bar icons. Defaults to the ramp: dark glyphs on light, light on
   * dark. Only override it for a screen with its own coloured hero behind the
   * status bar — otherwise the default is right by construction, which is why
   * the per-screen prop is being removed from screens as they are migrated.
   */
  barStyle?: 'light-content' | 'dark-content';
  /** Safe-area edges to inset. Default: none — AppBar handles the top. */
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}

const Screen: React.FC<ScreenProps> = ({
  children,
  background,
  barStyle,
  edges = [],
  style,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[styles.root, { backgroundColor: background ?? colors.bg }, style]}
    >
      <StatusBar
        barStyle={barStyle ?? (isDark ? 'light-content' : 'dark-content')}
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView style={styles.root} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default Screen;
