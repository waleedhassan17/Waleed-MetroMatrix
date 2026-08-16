// ============================================================================
// OutgoingCallView — the caller's side, shared by every module.
//
// SIGNALLING ONLY. This screen coordinates call state over the socket; the
// audio is the phone's own dialer. It replaces a mock that faked a connection
// with `setTimeout(..., 3000)` and ran a cosmetic duration timer while no call
// existed at all.
//
// States shown: ringing -> connected (dialer opens) | busy | declined | missed.
// `busy` is the case where the callee is already on another in-app call — the
// server refuses to ring them and answers the caller directly.
// ============================================================================

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallSession, CallPhase } from '../../services/call/useCallSession';
import type { RoomType } from '../../services/socket/socketClient';

export interface OutgoingCallViewProps {
  roomId: string;
  roomType: RoomType;
  counterpartName?: string;
  counterpartPhone?: string;
  counterpartImage?: string;
  accent?: string;
  /** Start ringing as soon as the screen opens. */
  autoRing?: boolean;
}

const STATUS_COPY: Record<CallPhase, string> = {
  idle: 'Ready to call',
  ringing: 'Ringing…',
  incoming: 'Incoming call',
  connected: 'Connected — continue in your dialer',
  busy: 'On another call',
  declined: 'Call declined',
  missed: 'No answer',
  ended: 'Call ended',
};

export const OutgoingCallView: React.FC<OutgoingCallViewProps> = ({
  roomId,
  roomType,
  counterpartName,
  counterpartPhone,
  counterpartImage,
  accent = '#2563EB',
  autoRing = true,
}) => {
  const navigation = useNavigation<any>();

  const { phase, error, ring, end, dial } = useCallSession({
    roomId,
    roomType,
    counterpartPhone,
    counterpartName,
    onClosed: (final) => {
      // Leave the outcome on screen briefly so the user sees WHY it ended
      // rather than being bounced back with no explanation.
      const delay = final === 'busy' || final === 'missed' || final === 'declined' ? 1800 : 700;
      setTimeout(() => navigation.canGoBack() && navigation.goBack(), delay);
    },
  });

  useEffect(() => {
    if (autoRing) ring();
    // Intentionally once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const terminal = phase === 'busy' || phase === 'declined' || phase === 'missed' || phase === 'ended';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0F172A' }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.top}>
        {counterpartImage ? (
          <Image source={{ uri: counterpartImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={48} color="#94A3B8" />
          </View>
        )}
        <Text style={styles.name}>{counterpartName || 'Contact'}</Text>
        <Text style={styles.status}>{error || STATUS_COPY[phase]}</Text>

        {phase === 'ringing' && <ActivityIndicator style={{ marginTop: 18 }} color="#94A3B8" />}

        {phase === 'busy' && (
          <Text style={styles.hint}>
            They are already on a call. Try again in a moment.
          </Text>
        )}
        {phase === 'connected' && (
          <Text style={styles.hint}>
            Your phone's dialer has taken over the call. Hang up there when you're done.
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        {phase === 'connected' && !!counterpartPhone && (
          <TouchableOpacity
            style={[styles.roundBtn, { backgroundColor: '#16A34A' }]}
            onPress={() => dial(counterpartPhone)}
          >
            <Ionicons name="call" size={26} color="#fff" />
          </TouchableOpacity>
        )}
        {!terminal && (
          <TouchableOpacity style={[styles.roundBtn, styles.endBtn]} onPress={end}>
            <Ionicons name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        )}
        {terminal && (
          <TouchableOpacity
            style={[styles.roundBtn, { backgroundColor: accent }]}
            onPress={() => navigation.canGoBack() && navigation.goBack()}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.footnote}>
        Calls connect through your phone line — standard carrier rates apply.
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingVertical: 56 },
  top: { alignItems: 'center', marginTop: 40, paddingHorizontal: 24 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 22 },
  avatarFallback: { backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
  name: { color: '#fff', fontSize: 26, fontWeight: '700', textAlign: 'center' },
  status: { color: '#94A3B8', fontSize: 16, marginTop: 10 },
  hint: { color: '#64748B', fontSize: 13, marginTop: 16, textAlign: 'center', lineHeight: 19 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 28 },
  roundBtn: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  endBtn: { backgroundColor: '#DC2626' },
  footnote: { color: '#475569', fontSize: 12, textAlign: 'center', paddingHorizontal: 32 },
});

export default OutgoingCallView;
