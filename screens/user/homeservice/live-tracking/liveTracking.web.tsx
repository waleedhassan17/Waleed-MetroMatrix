import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, T } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';

// Web stub: MapLibre React Native is native-only. The live-tracking screen
// (liveTracking.tsx) is used on iOS/Android automatically.
export default function LiveTrackingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Tracking</Text>
      <Text style={styles.text}>Live location tracking is available in the mobile app.</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: c.surface },
  title: { ...T.heading, marginBottom: 8, color: c.ink },
  text: { ...T.body, color: c.inkMuted, textAlign: 'center' },
});
