import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Web stub: react-native-maps has no web support. The native live-tracking screen
// (liveTracking.tsx) is used on iOS/Android automatically.
export default function LiveTrackingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Tracking</Text>
      <Text style={styles.text}>Live location tracking is available in the mobile app.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#222' },
  text: { color: '#666', fontSize: 15, textAlign: 'center' },
});
