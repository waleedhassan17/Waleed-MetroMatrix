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
  AppState,
  type AppStateStatus,
} from 'react-native';
import { getSocket, emitEvent, RoomType } from '../../services/socket/socketClient';
import { startRingtone, stopRingtone, stopRingtoneSync } from '../../services/call/ringtone';
import {
  showIncomingCallNotification,
  dismissIncomingCallNotification,
} from '../../services/call/callNotification';
import { getNotifee } from '../../services/native/optionalNativeModule';
import { navigate } from '../../navigation-maps/navigationRef';
import { useAppDispatch } from '../../hooks/useReduxHooks';
import { messageReceived, loadUnread } from '../../store/unreadSlice';
import { activeChatRoomId } from '../../services/chat/activeRoom';

interface IncomingCall {
  callId: string;
  roomId: string;
  roomType: RoomType;
  callerName?: string;
  callerId?: string;
  /** What the CALLER placed. Undefined falls back to the per-vertical default. */
  media?: 'audio' | 'video';
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

// Repeating buzz while ringing, alongside the ringtone. Kept as its own signal
// because it is the ONLY one that survives a build without expo-audio, and
// because a silenced phone still buzzes.
const VIBRATION_PATTERN = Platform.OS === 'android' ? [0, 700, 700] : [0, 700, 700];

interface IncomingCallProviderProps {
  children: React.ReactNode;
}

/** How often to retry binding while there is no socket yet (no token). */
const BIND_RETRY_MS = 3000;

/**
 * Local backstop for a ring the server never closes.
 *
 * Deliberately LONGER than the server's 30s RING_TIMEOUT_MS so the server wins
 * the race normally and this only fires when its frame never arrived at all.
 */
const LOCAL_RING_TIMEOUT_MS = 40_000;

export const IncomingCallProvider: React.FC<IncomingCallProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const activeRef = useRef<string | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateSubRef = useRef<{ remove: () => void } | null>(null);

  // The single teardown path — decline, remote hangup, timeout and accept all
  // funnel through here, so the ringtone is stopped in one place rather than
  // five that can drift apart. Leaving it playing is the worst failure mode
  // available: a phone that will not stop ringing.
  const dismiss = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    appStateSubRef.current?.remove();
    appStateSubRef.current = null;
    Vibration.cancel();
    stopRingtoneSync();
    // The call notification is `ongoing`, so the user CANNOT swipe it away
    // themselves. Failing to cancel it here leaves a permanently ringing phone
    // with no way to stop it — strictly worse than never showing one.
    dismissIncomingCallNotification();
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

    // Two surfaces, chosen by whether anyone can actually see the app.
    //
    // Foregrounded: the modal below, plus a ringtone — a call arriving with the
    // app open used to make no sound whatsoever, because there was no audio
    // here and the push that would have made one is deliberately suppressed for
    // exactly this case, on the assumption this sheet announced itself.
    //
    // Backgrounded or locked: there is no React tree on screen, so the modal is
    // invisible and a ringtone alone gives the user nothing to press. A
    // full-screen-intent notification is the only actionable surface there.
    if (AppState.currentState === 'active') {
      startRingtone();
    } else {
      showIncomingCallNotification(call);
    }

    // A RING CAN OUTLIVE THE STATE IT STARTED IN.
    //
    // The surface above was chosen once, at ring time, and never revisited. So
    // backgrounding the app mid-ring left the callee with nothing: the OS
    // silences the tone (the player is created with shouldPlayInBackground
    // false) and the full-screen notification was never raised, because that
    // decision had already been made. A vibration, and nothing to press.
    //
    // Swap surfaces whenever the app crosses that boundary, for as long as this
    // call is the active one.
    const onAppState = (next: AppStateStatus) => {
      if (activeRef.current !== call.callId) return;
      if (next === 'active') {
        dismissIncomingCallNotification();
        startRingtone();
      } else {
        stopRingtoneSync();
        showIncomingCallNotification(call);
      }
    };
    appStateSubRef.current?.remove();
    appStateSubRef.current = AppState.addEventListener('change', onAppState);

    // A LOCAL SAFETY NET FOR THE RING ITSELF.
    //
    // The 30s no-answer timeout lives on the CALLER's screen; the callee's
    // sheet only stops when the server's call_missed/call_end frame arrives.
    // If the callee's socket drops in between — waking from doze is the classic
    // case — that frame never lands and the phone rings forever with no way to
    // stop it but force-quitting. Slightly longer than the server's timeout so
    // the server still wins the race in the normal case.
    ringTimeoutRef.current = setTimeout(() => {
      if (activeRef.current === call.callId) dismiss();
    }, LOCAL_RING_TIMEOUT_MS);

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
  }, [dismiss]);

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
        media: p.media === 'video' || p.media === 'audio' ? p.media : undefined,
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

    // THE GLOBAL UNREAD LISTENER.
    //
    // `new_message` was bound only inside useRoomSocket, which only the open
    // chat screen mounts — so leaving the thread meant nothing in the app was
    // listening, and a message produced no in-app signal of any kind. This
    // rides the same socket and the same retry/rebind logic the ring uses.
    //
    // Skipped for the room currently on screen: that screen appends the
    // message itself and marks it read, so counting it would show a badge for
    // something the user is looking at.
    const onAnyMessage = (m: any) => {
      if (!mounted || !m) return;
      const roomId = String(m.bookingId || m.roomId || m.booking || '');
      if (!roomId || roomId === activeChatRoomId()) return;
      dispatch(messageReceived({ roomId }));
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

      s.on('new_message', onAnyMessage);
      s.on('call_ring', onRing);
      s.on('call_end', onStop);
      s.on('call_missed', onStop);
      s.on('call_decline', onStop);
      // Socket.IO reconnects transparently, but a reconnect is also the moment
      // a fresh token took effect — re-binding here keeps this correct across
      // token refreshes and Heroku dyno cycles.
      s.on('connect', bind);

      // Seed the counts from the server. The live listener above only sees what
      // arrives from now on; anything unread from before — including while the
      // app was closed — comes from here.
      dispatch(loadUnread());

      detach = () => {
        s.off('new_message', onAnyMessage);
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
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      appStateSubRef.current?.remove();
      appStateSubRef.current = null;
      Vibration.cancel();
      stopRingtoneSync();
      // The call notification is `ongoing`, so the user cannot swipe it away.
      // Unmounting without cancelling it left a stuck, looping notification
      // with no way to dismiss it.
      dismissIncomingCallNotification();
      detach?.();
    };
  }, [present, dismiss, dispatch]);

  const accept = useCallback(async () => {
    if (!incoming) return;
    const { callId, roomId, roomType, callerName, media } = incoming;
    Vibration.cancel();
    // AWAITED, not fire-and-forget. The ringtone and the call want the same
    // audio hardware; if it is still playing when usePeerConnection calls
    // getUserMedia, the call can start on a route media playback already owns —
    // no audio, or earpiece audio at ringer volume. Release it first, then hand
    // off to the call screen.
    await stopRingtone();
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
      // Answer the kind of call that was actually placed. Omitting this left
      // CallScreen to infer it from roomType, so a healthcare VOICE call was
      // answered with the camera on.
      media,
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

  // Accept / Decline pressed on the LOCK-SCREEN notification rather than in the
  // app. Without this the buttons render and do nothing, which is worse than
  // not offering them: the phone keeps ringing and the caller keeps waiting.
  //
  // THIS IS WHERE "Notifee native module not found." CAME FROM. The guard was a
  // try/catch around require(), but notifee's import succeeds — it throws from
  // a getter on the FIRST API ACCESS, which is the onForegroundEvent call
  // below, outside the try. So every incoming call on a build without the
  // native module raised an uncaught error on the receiver.
  //
  // getNotifee() checks NativeModules.NotifeeApiModule before touching the API,
  // and the subscription itself is wrapped too.
  useEffect(() => {
    const loaded = getNotifee();
    if (!loaded) return;
    const { api: notifee, constants: mod } = loaded;

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = notifee.onForegroundEvent(({ type, detail }: any) => {
        if (type !== mod.EventType.ACTION_PRESS) return;
        const id = detail?.pressAction?.id;
        if (id === 'accept') accept();
        else if (id === 'decline') decline();
      });
    } catch {
      // The in-app sheet remains the surface; nothing else to do.
      return;
    }

    return () => {
      try {
        unsubscribe?.();
      } catch {
        /* already torn down */
      }
    };
  }, [accept, decline]);

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
