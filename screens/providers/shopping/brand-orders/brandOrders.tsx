import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

const BrandOrdersScreen: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Brand Orders</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBFF' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 8 },
});

export default BrandOrdersScreen;
