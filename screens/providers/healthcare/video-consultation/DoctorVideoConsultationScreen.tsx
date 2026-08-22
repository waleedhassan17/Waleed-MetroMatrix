// ============================================================================
// Doctor video consultation — now a redirect.
//
// This screen used to render a Jitsi room in a WebView, using a `roomUrl`
// minted by the healthcare backend. Video consultations have moved onto the
// same peer-to-peer WebRTC stack as every other call in the app, so that URL
// no longer exists and the WebView had nothing to load.
//
// Every known entry point already navigates straight to the unified call
// screen. This redirect exists for the ones that might not — a deep link, a
// stale notification, a nav stack restored from before the change — so they
// land on a working call instead of a blank WebView.
// ============================================================================

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function DoctorVideoConsultationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const appointmentId = route.params?.appointmentId ?? '';

  useEffect(() => {
    if (!appointmentId) {
      navigation.goBack();
      return;
    }
    navigation.replace('HealthcareConsultCall', {
      roomId: appointmentId,
      appointmentId,
      roomType: 'healthcare',
      media: 'video',
      counterpartName: route.params?.patientName,
    });
  }, [appointmentId, navigation, route.params?.patientName]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' },
});
