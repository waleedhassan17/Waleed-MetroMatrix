// ============================================================================
// Customer-side chat with a home-service provider.
//
// The room is the BOOKING, so a real conversation requires a bookingId — that
// is what the realtime service authorizes both parties against.
//
// What changed: this screen used to run a scripted fake conversation whenever
// no bookingId was passed — two hardcoded "provider" messages on mount and a
// canned reply 2 seconds after every send ("Thank you for your message. I'll be
// there as soon as possible!"). Four of its five entry points passed no
// bookingId, so most users only ever saw the fake. Faking a reply from a real
// business is worse than saying chat isn't open yet, so the pre-booking case
// now states that plainly.
// ============================================================================

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ChatThread from '../../../../components/chat/ChatThread';
import { ChatParticipant } from '../../../../models/serviceProviders';

interface ProviderInfo {
  id?: string;
  name?: string;
  image?: string;
  profileImage?: string;
  phoneNumber?: string;
}

type Params = {
  bookingId?: string;
  provider?: ProviderInfo;
  serviceType?: string;
  jobDescription?: string;
  location?: string;
};

const ACCENT = '#2563EB';
const ACCENT_SOFT = '#DBEAFE';

export default function ProvidersChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const { bookingId, provider } = route.params || ({} as Params);

  const [counterpart, setCounterpart] = useState<ChatParticipant | null>(null);

  const handleParticipants = useCallback((them: ChatParticipant) => {
    setCounterpart(them);
  }, []);

  const handleCall = useCallback(
    (them: ChatParticipant | null) => {
      const target = them || counterpart;
      navigation.navigate('CallScreen', {
        bookingId,
        provider,
        counterpartName: target?.name || provider?.name,
        counterpartPhone: target?.phoneNumber,
      });
    },
    [navigation, bookingId, provider, counterpart]
  );

  // Pre-booking: there is no room to join, so be honest about it.
  if (!bookingId) {
    const avatarUri = provider?.image || provider?.profileImage;
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={ACCENT} />
        <View style={[styles.header, { backgroundColor: ACCENT }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {provider?.name || 'Provider'}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.center}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={38} color="#9CA3AF" />
            </View>
          )}
          <Text style={styles.title}>Chat opens with your booking</Text>
          <Text style={styles.body}>
            Once you book {provider?.name || 'this provider'}, you can message and
            call them directly here about the job.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>Back to provider</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ChatThread
      roomId={bookingId}
      roomType="homeservice"
      accent={ACCENT}
      accentSoft={ACCENT_SOFT}
      fallbackTitle={provider?.name || 'Provider'}
      onParticipantsLoaded={handleParticipants}
      onCall={handleCall}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerBtn: { padding: 6, width: 36 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 20 },
  avatarFallback: { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '700', color: '#111827', textAlign: 'center' },
  body: { fontSize: 15, color: '#6B7280', lineHeight: 22, textAlign: 'center', marginTop: 10 },
  btn: {
    marginTop: 26,
    backgroundColor: ACCENT,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
