// ============================================================================
// THE chat screen. One implementation for every vertical and both roles.
//
// Replaces four wrappers that differed only in accent colour and param name:
//   user/homeservice/providers-chat      (customer <-> home-service provider)
//   providers/homeservice/provider-chat  (provider <-> customer)
//   user/healthcare/ConsultChat          (patient  <-> doctor)
//   providers/healthcare/consult-chat    (doctor   <-> patient)
//
// All the real work already lived in components/chat/ChatThread; these screens
// only resolved a room and forwarded to it.
//
// Pre-booking entry points (provider profile, provider list, provider search)
// navigate here with a `provider` and no room. Rather than dead-ending on a
// placeholder, this screen resolves the customer's booking with that provider
// — see utils/homeservice/resolveProviderRoom.
// ============================================================================

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { darkShift, type DarkShift } from '../../../constants/darkShift';
import { useTheme } from '../../../theme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../components/ui';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ChatThread from '../../../components/chat/ChatThread';
import { ChatParticipant } from '../../../models/serviceProviders';
import { resolveProviderBookingId } from '../../../utils/homeservice/resolveProviderRoom';
import { normalizeRoomParams, type RoomParams } from './roomParams';

export default function ChatScreen() {
  const { mode } = useTheme();
  const sh = useMemo(() => darkShift(mode), [mode]);
  const styles = useMemo(() => makeStyles(sh), [sh]);
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RoomParams }, 'params'>>();
  const room = normalizeRoomParams(route.params);
  const insets = useSafeAreaInsets();

  const [counterpart, setCounterpart] = useState<ChatParticipant | null>(null);
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

  const handleParticipants = useCallback((them: ChatParticipant) => {
    setCounterpart(them);
  }, []);

  const handleCall = useCallback(
    (them: ChatParticipant | null) => {
      const target = them || counterpart;
      navigation.navigate('Call', {
        roomId: resolvedId || undefined,
        roomType: room.roomType,
        counterpartName: target?.name || room.name,
        counterpartImage: target?.image || room.image,
        accent: room.accent,
      });
    },
    [navigation, resolvedId, room, counterpart]
  );

  if (resolving) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={room.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // Genuinely no room with this person: say so, and offer the action that fixes it.
  if (!resolvedId) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View
          style={[
            styles.header,
            { backgroundColor: room.accent, paddingTop: insets.top + 12 },
          ]}
        >
          <BackButton tone="onAccent" onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {room.name || 'Chat'}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.center}>
          {room.image ? (
            <Image source={{ uri: room.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={38} color="#9CA3AF" />
            </View>
          )}
          <Text style={styles.title}>Chat opens with your booking</Text>
          <Text style={styles.body}>
            Once you book {room.name || 'this provider'}, you can message and call
            them directly here about the job.
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
    <ChatThread
      roomId={resolvedId}
      roomType={room.roomType}
      accent={room.accent}
      accentSoft={room.accentSoft}
      fallbackTitle={room.name || 'Chat'}
      onParticipantsLoaded={handleParticipants}
      onCall={handleCall}
    />
  );
}

const makeStyles = (sh: DarkShift) => StyleSheet.create({
  container: { flex: 1, backgroundColor: sh.n('#F9FAFB', 'bg') },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerBtn: { width: 40, height: 40 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 20 },
  avatarFallback: { backgroundColor: sh.n('#E5E7EB', 'line'), alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '700', color: sh.n('#111827', 'ink'), textAlign: 'center' },
  body: { fontSize: 15, color: sh.n('#6B7280', 'inkMuted'), lineHeight: 22, textAlign: 'center', marginTop: 10 },
  btn: { marginTop: 26, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkBtn: { marginTop: 14, padding: 8 },
  linkText: { color: sh.n('#6B7280', 'inkMuted'), fontSize: 14, fontWeight: '600' },
});
