import React from 'react';
import { StatusBar, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { C } from '../../constants/theme';

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
  /** Page ground. Defaults to the neutral canvas. */
  background?: string;
  barStyle?: 'light-content' | 'dark-content';
  /** Safe-area edges to inset. Default: none — AppBar handles the top. */
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}

const Screen: React.FC<ScreenProps> = ({
  children,
  background = C.bg,
  barStyle = 'dark-content',
  edges = [],
  style,
}) => (
  <View style={[styles.root, { backgroundColor: background }, style]}>
    <StatusBar barStyle={barStyle} backgroundColor="transparent" translucent />
    <SafeAreaView style={styles.root} edges={edges}>
      {children}
    </SafeAreaView>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default Screen;
