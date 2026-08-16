// ============================================================================
// IncomingCallProvider — the app-wide incoming-call listener.
//
// Mounted once, inside NavigationContainer. Without this nothing in the app
// listens for `call_ring`, so a ring could never surface no matter how well the
// backend routed it: the callee simply never found out they were being called.
//
// The server targets a per-user room, so the ring arrives regardless of which
// screen the callee is on and whether they have joined the conversation room.
//
// Answering hands off to the phone's native dialer (`tel:`), consistent with
// the rest of the calling design — there is no in-app audio.
// ============================================================================

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { getSocket, emitEvent, RoomType } from '../../services/socket/socketClient';

interface IncomingCall {
  callId: string;
  roomId: string;
  roomType: RoomType;
  callerName?: string;
  callerPhone?: string;
  callerId?: string;
}

interface IncomingCallContextValue {
  incoming: IncomingCall | null;
  /** Surface a call that arrived via a notification tap rather than a socket. */
  present: (call: IncomingCall) => void;
  dismiss: () => void;
}

const IncomingCallContext = createContext<IncomingCallContextValue>({
  incoming: null,
  present: () => {},
  dismiss: () => {},
});

export const useIncomingCall = () => useContext(IncomingCallContext);

// Repeating buzz while ringing. expo-av is not installed, so there is no
// ringtone — vibration is the honest signal we can give without adding a
// native dependency.
const VIBRATION_PATTERN = Platform.OS === 'android' ? [0, 700, 700] : [0, 700, 700];

export const IncomingCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const activeRef = useRef<string | null>(null);

  const dismiss = useCallback(() => {
    Vibration.cancel();
    activeRef.current = null;
    setIncoming(null);
  }, []);

  const present = useCallback((call: IncomingCall) => {
    // Ignore a duplicate ring for a call already on screen (the server targets
    // both the personal room and the conversation room, so a callee who has the
    // chat open receives it twice).
    if (activeRef.current === call.callId) return;
    activeRef.current = call.callId;
    setIncoming(call);
    Vibration.vibrate(VIBRATION_PATTERN, true);
  }, []);

  useEffect(() => {
    let mounted = true;
    let detach: (() => void) | null = null;

    (async () => {
      const s = await getSocket();
      if (!s || !mounted) return;

      const onRing = (p: any) => {
        if (!mounted || !p?.callId) return;
        present({
          callId: p.callId,
          roomId: p.roomId,
          roomType: p.roomType || 'homeservice',
          callerName: p?.from?.name,
          callerPhone: p?.from?.phoneNumber,
          callerId: p?.from?.id,
        });
      };
      // The caller hung up, the ring timed out, or the other side cancelled —
      // take the sheet down rather than leaving it buzzing forever.
      const onStop = (p: any) => {
        if (!mounted) return;
        if (!p?.callId || p.callId === activeRef.current) dismiss();
      };

      s.on('call_ring', onRing);
      s.on('call_end', onStop);
      s.on('call_missed', onStop);
      s.on('call_decline', onStop);

      detach = () => {
        s.off('call_ring', onRing);
        s.off('call_end', onStop);
        s.off('call_missed', onStop);
        s.off('call_decline', onStop);
      };
    })();

    return () => {
      mounted = false;
      Vibration.cancel();
      detach?.();
    };
  }, [present, dismiss]);

  const accept = useCallback(async () => {
    if (!incoming) return;
    const { callId, roomId, roomType, callerPhone } = incoming;
    Vibration.cancel();

    const ack = await emitEvent('call_accept', {
      callId,
      roomId,
      bookingId: roomId,
      roomType,
    });
    dismiss();

    if (!ack.success) {
      Alert.alert('Call ended', ack.message || 'That call is no longer active.');
      return;
    }

    const number = (callerPhone || '').replace(/\s|-/g, '');
    if (!number) {
      Alert.alert('No phone number', 'The caller has no phone number on file.');
      return;
    }
    try {
      await Linking.openURL(`tel:${number}`);
    } catch {
      Alert.alert('Cannot place call', 'The dialer could not be opened.');
    }
  }, [incoming, dismiss]);

  const decline = useCallback(async () => {
    if (!incoming) return;
    const { callId, roomId, roomType } = incoming;
    Vibration.cancel();
    emitEvent('call_decline', { callId, roomId, bookingId: roomId, roomType });
    dismiss();
  }, [incoming, dismiss]);

  return (
    <IncomingCallContext.Provider value={{ incoming, present, dismiss }}>
      {children}
      <Modal visible={!!incoming} animationType="slide" transparent={false} onRequestClose={decline}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.label}>
              {incoming?.roomType === 'healthcare' ? 'Incoming consultation call' : 'Incoming call'}
            </Text>
            <Text style={styles.name}>{incoming?.callerName || 'Unknown caller'}</Text>
            {!!incoming?.callerPhone && <Text style={styles.phone}>{incoming.callerPhone}</Text>}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.decline]} onPress={decline}>
              <Text style={styles.btnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.accept]} onPress={accept}>
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>Accepting opens your phone's dialer</Text>
        </View>
      </Modal>
    </IncomingCallContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'space-between', paddingVertical: 72 },
  header: { alignItems: 'center', marginTop: 40 },
  label: { color: '#94A3B8', fontSize: 15, marginBottom: 12 },
  name: { color: '#FFFFFF', fontSize: 30, fontWeight: '700', textAlign: 'center', paddingHorizontal: 24 },
  phone: { color: '#CBD5E1', fontSize: 16, marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 24 },
  btn: { paddingVertical: 18, paddingHorizontal: 34, borderRadius: 40, minWidth: 140, alignItems: 'center' },
  decline: { backgroundColor: '#DC2626' },
  accept: { backgroundColor: '#16A34A' },
  btnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  hint: { color: '#64748B', fontSize: 13, textAlign: 'center' },
});
