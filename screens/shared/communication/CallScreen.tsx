// ============================================================================
// THE call screen. One implementation for every vertical and both roles.
//
// Replaces three wrappers that differed only in accent colour and param name:
//   user/homeservice/call-screen          (customer -> provider)
//   providers/homeservice/call-screen     (provider -> customer)
//   user/healthcare/ConsultCall           (patient  <-> doctor)
//
// Ring / accept / end travel over the socket to the real counterpart, and the
// audio (plus video, for a healthcare consultation) flows peer-to-peer over
// WebRTC. The screen this replaced on the customer side was entirely fake — it
// moved itself to "connected" after setTimeout(3000) and offered toggles that
// flipped local booleans; the toggles here operate on real media tracks.
//
// A CALL NEEDS A ROOM, AND A ROOM IS A BOOKING — that is what the realtime
// service authorizes against (metromatrix-realtime/src/utils/access.js). Entry
// points that browse providers pass only a `provider`, so this screen resolves
// the backing booking itself instead of dead-ending.
// ============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { darkShift, type DarkShift } from '../../../constants/darkShift';
import { useTheme } from '../../../theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import OutgoingCallView from '../../../components/call/OutgoingCallView';
import { resolveProviderBookingId } from '../../../utils/homeservice/resolveProviderRoom';
import { normalizeRoomParams, type RoomParams } from './roomParams';

export default function CallScreen() {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RoomParams }, 'params'>>();
  const room = normalizeRoomParams(route.params);

  // null = still resolving, '' = resolved to nothing.
  const [resolvedId, setResolvedId] = useState<string | null>(room.roomId || null);
  const [resolving, setResolving] = useState(!room.roomId);

  useEffect(() => {
    if (room.roomId) return;
    let alive = true;
    (async () => {
      const id = await resolveProviderBookingId(room.providerId);
      if (!alive) return;
      setResolvedId(id || '');
      setResolving(false);
    })();
    return () => {
      alive = false;
    };
  }, [room.roomId, room.providerId]);

  if (resolving) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={room.accent} />
          <Text style={styles.body}>Connecting…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!resolvedId) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <Ionicons name="call-outline" size={56} color="#64748B" />
          <Text style={styles.title}>Calling isn't available yet</Text>
          <Text style={styles.body}>
            You can call {room.name || 'this provider'} once you have a booking with
            them. Book the service first, then call from here, the booking screen,
            or chat.
          </Text>
          {room.providerId ? (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: room.accent }]}
              onPress={() =>
                navigation.navigate('BookingScreen', {
                  providerId: room.providerId,
                  category: room.serviceType,
                })
              }
            >
              <Text style={styles.btnText}>Book {room.name || 'this provider'}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <OutgoingCallView
      roomId={resolvedId}
      roomType={room.roomType}
      counterpartName={room.name}
      counterpartImage={room.image}
      accent={room.accent}
      incomingCallId={route.params?.incomingCallId}
      autoAccept={route.params?.autoAccept}
      // A healthcare room is a consultation, so it carries video unless the
      // caller explicitly asked for audio.
      media={route.params?.media || (room.roomType === 'healthcare' ? 'video' : 'audio')}
    />
  );
}

const makeStyles = (sh: DarkShift) => StyleSheet.create({
  container: { flex: 1, backgroundColor: sh.n('#0F172A', 'ink') },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { color: sh.n('#F1F5F9', 'lineSoft'), fontSize: 20, fontWeight: '700', marginTop: 18, textAlign: 'center' },
  body: { color: sh.n('#94A3B8', 'inkFaint'), fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 12 },
  btn: { marginTop: 28, paddingHorizontal: 30, paddingVertical: 13, borderRadius: 24 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkBtn: { marginTop: 16, padding: 8 },
  linkText: { color: sh.n('#94A3B8', 'inkFaint'), fontSize: 14, fontWeight: '600' },
});
