import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { makeProviderTheme, type ProviderTheme } from '../providerTheme';

// Web stub: react-native-maps has no web support. The native map screen
// (map.tsx) is used on iOS/Android automatically.
export default function NavigationMapScreen() {
  const { colors } = useTheme();
  const theme = useMemo(() => makeProviderTheme(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors, theme), [colors, theme]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map</Text>
      <Text style={styles.text}>Live maps are available in the mobile app.</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors, theme: ProviderTheme) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: c.surface },
  title: { ...T.heading, marginBottom: 8, color: c.ink },
  text: { ...T.body, color: c.inkMuted, textAlign: 'center' },
});
