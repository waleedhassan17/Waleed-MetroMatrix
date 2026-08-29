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
// Answering does NOT accept the call here — it navigates to the call screen,
// which owns both the accept and the peer connection. See accept() below for
// why splitting those two would race.
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
  Alert,
} from 'react-native';
import { getSocket, emitEvent, RoomType } from '../../services/socket/socketClient';
import { navigate } from '../../navigation-maps/navigationRef';

interface IncomingCall {
  callId: string;
  roomId: string;
  roomType: RoomType;
  callerName?: string;
  callerId?: string;
}

interface IncomingCallContextValue {
  incoming: IncomingCall | null;
  /**
   * Surface a call that arrived via a notification tap rather than a socket.
   * @returns whether it was actually presented (false = already on screen).
   */
  present: (call: IncomingCall) => boolean;
  dismiss: () => void;
}

const IncomingCallContext = createContext<IncomingCallContextValue>({
  incoming: null,
  present: () => false,
  dismiss: () => {},
});

export const useIncomingCall = () => useContext(IncomingCallContext);

// Repeating buzz while ringing. expo-av is not installed, so there is no
// ringtone — vibration is the honest signal we can give without adding a
// native dependency.
const VIBRATION_PATTERN = Platform.OS === 'android' ? [0, 700, 700] : [0, 700, 700];

interface IncomingCallProviderProps {
  children: React.ReactNode;
}

/** How often to retry binding while there is no socket yet (no token). */
const BIND_RETRY_MS = 3000;

export const IncomingCallProvider: React.FC<IncomingCallProviderProps> = ({ children }) => {
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
    if (activeRef.current === call.callId) return false;
    activeRef.current = call.callId;
    setIncoming(call);
    Vibration.vibrate(VIBRATION_PATTERN, true);

    // TELL THE CALLER THEIR CALL IS ACTUALLY RINGING.
    //
    // This is the moment — and the only moment — at which "Ringing…" becomes
    // true. Until this ack reaches them the caller's screen says "Calling…".
    // Emitted here rather than in the socket handler so a call surfaced from a
    // notification tap acknowledges too; the server ignores it if the call has
    // already moved on.
    emitEvent('call_ringing', {
      callId: call.callId,
      roomId: call.roomId,
      bookingId: call.roomId,
      roomType: call.roomType,
    }).catch(() => {
      /* best effort — the caller simply stays on "Calling…" */
    });

    return true;
  }, []);

  // ==========================================================================
  // BINDING THE RING LISTENER — driven by the SOCKET, never by identity.
  //
  // This is the bug where a provider could place calls but never receive them.
  // The listener was gated on a `sessionKey` derived from
  // `currentUser?.id || currentProvider?.id`, and that identity is not
  // trustworthy: the backend's User/Provider toJSON emit `_id` (toObject with
  // no virtuals), and the profile fetch hit `/user/me` and `/provider/me`,
  // which are 404 in production. So the id was frequently undefined, the gate
  // never opened, and the device silently never listened for calls. Outgoing
  // calls kept working because they don't come through here at all — which is
  // exactly why the failure looked one-directional rather than broken.
  //
  // A missed ring is unrecoverable: there is no retry, the caller waits 30s and
  // is told "No answer". So this must not depend on anything that can be
  // absent. It binds whenever a socket exists, re-binds on every reconnect, and
  // keeps retrying while getSocket() returns null (no token yet), which also
  // covers signing in after mount — the case the old gate was added for.
  // ==========================================================================
  useEffect(() => {
    let mounted = true;
    let detach: (() => void) | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const onRing = (p: any) => {
      if (!mounted || !p?.callId) return;
      present({
        callId: p.callId,
        roomId: p.roomId,
        roomType: p.roomType || 'homeservice',
        callerName: p?.from?.name,
        callerId: p?.from?.id,
      });
    };
    // The caller hung up, the ring timed out, or the other side cancelled —
    // take the sheet down rather than leaving it buzzing forever.
    const onStop = (p: any) => {
      if (!mounted) return;
      if (!p?.callId || p.callId === activeRef.current) dismiss();
    };

    const bind = async () => {
      if (!mounted) return;
      const s = await getSocket();
      if (!mounted) return;

      if (!s) {
        // No token yet — the user has not signed in, or the session is still
        // hydrating. Keep trying; giving up here is what left a whole session
        // unable to receive calls.
        retry = setTimeout(bind, BIND_RETRY_MS);
        return;
      }

      // Idempotent: off() before on() so a re-bind after a reconnect cannot
      // stack a second copy of every handler and ring twice.
      detach?.();

      s.on('call_ring', onRing);
      s.on('call_end', onStop);
      s.on('call_missed', onStop);
      s.on('call_decline', onStop);
      // Socket.IO reconnects transparently, but a reconnect is also the moment
      // a fresh token took effect — re-binding here keeps this correct across
      // token refreshes and Heroku dyno cycles.
      s.on('connect', bind);

      detach = () => {
        s.off('call_ring', onRing);
        s.off('call_end', onStop);
        s.off('call_missed', onStop);
        s.off('call_decline', onStop);
        s.off('connect', bind);
      };
    };

    bind();

    return () => {
      mounted = false;
      if (retry) clearTimeout(retry);
      Vibration.cancel();
      detach?.();
    };
  }, [present, dismiss]);

  const accept = useCallback(() => {
    if (!incoming) return;
    const { callId, roomId, roomType, callerName } = incoming;
    Vibration.cancel();
    dismiss();

    // This sheet deliberately does NOT emit `call_accept` itself any more.
    //
    // It used to accept here and then open the native dialer. Under WebRTC the
    // accept and the peer connection have to be owned by the same thing, or
    // they race: the server retires the call from 'ring' on the first accept,
    // so a second one from the call screen would be refused as "no longer
    // ringing" and the media would never start. So the sheet hands off, and
    // the call screen's session does the accepting.
    navigate('CallScreen', {
      roomId,
      roomType,
      incomingCallId: callId,
      counterpartName: callerName,
      autoAccept: true,
    });
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
            <Text style={styles.phone}>
              {incoming?.roomType === 'healthcare' ? 'Video consultation' : 'MetroMatrix audio call'}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.decline]} onPress={decline}>
              <Text style={styles.btnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.accept]} onPress={accept}>
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>Connects inside the app — no call charges</Text>
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
