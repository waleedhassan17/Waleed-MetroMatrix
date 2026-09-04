import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, T } from '../../../../constants/theme';

// Web stub: jobDetail.tsx imports react-native-maps which has no web support.
// The native screen is used on iOS/Android automatically.
export default function JobDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Job Details</Text>
      <Text style={styles.text}>This screen with live map is available in the mobile app.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.surface },
  title: { ...T.heading, marginBottom: 8, color: C.ink },
  text: { ...T.body, color: C.inkMuted, textAlign: 'center' },
});
