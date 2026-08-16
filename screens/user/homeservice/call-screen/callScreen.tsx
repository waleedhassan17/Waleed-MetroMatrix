// ============================================================================
// Customer-side call screen (home service) — SIGNALLING ONLY.
//
// Replaces a screen that was entirely fake: it moved itself to "connected"
// after `setTimeout(..., 3000)`, ran a cosmetic duration timer, and offered
// mute/speaker toggles that flipped local booleans. No call was ever placed,
// and `provider.phoneNumber` was passed in but never used.
//
// Now: ring / accept / end travel over the socket to the real provider, and the
// audio is handed to the phone's native dialer.
//
// REQUIRES A BOOKING. Calling is only possible between the two parties of an
// actual booking — that is what the server authorizes against. Entry points
// that have no booking yet (browsing the provider list, viewing a profile
// before booking) cannot call and are told so.
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import OutgoingCallView from '../../../../components/call/OutgoingCallView';

interface ProviderInfo {
  id?: string;
  name?: string;
  phoneNumber?: string;
  image?: string;
  profileImage?: string;
}

type Params = {
  bookingId?: string;
  provider?: ProviderInfo;
  serviceType?: string;
  // Supplied when navigating from the chat screen, which already has them.
  counterpartName?: string;
  counterpartPhone?: string;
};

export default function CallScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const { bookingId, provider, counterpartName, counterpartPhone } =
    route.params || ({} as Params);

  if (!bookingId) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <Ionicons name="call-outline" size={56} color="#64748B" />
          <Text style={styles.title}>Calling isn't available yet</Text>
          <Text style={styles.body}>
            You can call {provider?.name || 'this provider'} once you have an active
            booking with them. Book the service first, then call from the booking
            screen or from chat.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <OutgoingCallView
      roomId={bookingId}
      roomType="homeservice"
      counterpartName={counterpartName || provider?.name}
      counterpartPhone={counterpartPhone || provider?.phoneNumber}
      counterpartImage={provider?.image || provider?.profileImage}
      accent="#2563EB"
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { color: '#F1F5F9', fontSize: 20, fontWeight: '700', marginTop: 18, textAlign: 'center' },
  body: { color: '#94A3B8', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 12 },
  btn: {
    marginTop: 28,
    backgroundColor: '#2563EB',
    paddingHorizontal: 30,
    paddingVertical: 13,
    borderRadius: 24,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
