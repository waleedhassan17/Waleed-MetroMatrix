import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
const ProductListScreen: React.FC = () => (
  <SafeAreaView style={s.c}><View style={s.w}><Text style={s.t}>Product List</Text><Text style={s.st}>Coming soon</Text></View></SafeAreaView>
);
const s = StyleSheet.create({ c: { flex: 1, backgroundColor: '#F8FBFF' }, w: { flex: 1, justifyContent: 'center', alignItems: 'center' }, t: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' }, st: { fontSize: 14, color: '#64748B', marginTop: 8 } });
export default ProductListScreen;
