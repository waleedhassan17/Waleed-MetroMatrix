// ============================================================================
// Patient video consultation — now a redirect.
//
// This was a 670-line screen that rendered a Jitsi room in a WebView from a
// backend-minted `roomUrl`. Video consultations have moved onto the same
// peer-to-peer WebRTC stack as every other call, so that URL no longer exists.
//
// Worth knowing what went with it: the mute / camera / speaker controls here
// only ever flipped Redux booleans — they never reached into the WebView, so
// muting did nothing — and the "network quality" meter was Math.random(). The
// unified call screen's controls operate on real media tracks.
//
// The one genuine loss is the in-call chat overlay (InCallChatScreen). It was
// bound to this transport; chat for the appointment is still reachable from
// the appointment screen. Re-adding it as an overlay on the unified call
// screen is a follow-up, not part of the transport change.
//
// Kept as a redirect rather than deleted so any deep link, stale notification
// or restored nav stack lands on a working call.
// ============================================================================

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function VideoCallScreen() {
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
      counterpartName: route.params?.doctorName,
    });
  }, [appointmentId, navigation, route.params?.doctorName]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' },
});
