import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#222' },
  text: { color: '#666', fontSize: 15, textAlign: 'center' },
});
